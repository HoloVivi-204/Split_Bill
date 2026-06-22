import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useParams } from 'react-router-dom';

import {
  createExpense,
  createSettlement,
  deleteMySettlementBankInfo,
  deleteExpense,
  getExpenseDetail,
  getGroupBalances,
  getGroupDetail,
  getMySettlementBankInfo,
  getSettlementSuggestions,
  listBanks,
  listExpenses,
  listGroupMembers,
  listSettlements,
  updateMySettlementBankInfo,
  updateExpense,
} from '../../api/groups';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { KpiTile } from '../../components/common/KpiTile';
import { PageContainer } from '../../components/common/PageContainer';
import { SurfaceCard } from '../../components/common/SurfaceCard';
import { UserAvatar } from '../../components/common/UserAvatar';
import { useAuthStore } from '../../stores/authStore';
import { formatCurrency } from '../../utils/formatCurrency';

const categories = [
  { value: 'food', label: 'Ăn uống' },
  { value: 'transport', label: 'Di chuyển' },
  { value: 'accommodation', label: 'Lưu trú' },
  { value: 'entertainment', label: 'Giải trí' },
  { value: 'shopping', label: 'Mua sắm' },
  { value: 'other', label: 'Khác' },
];

const splitTypeLabels = {
  equal: 'Chia đều',
  custom: 'Chia tùy chỉnh',
  percentage: 'Chia theo %',
};

function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

function buildInitialExpenseForm() {
  return {
    title: '',
    amount: '',
    paidBy: '',
    category: 'food',
    date: todayValue(),
    note: '',
    splitType: 'equal',
    receipt: null,
    splits: [],
  };
}

function buildInitialSettlementForm() {
  return {
    fromUser: '',
    toUser: '',
    amount: '',
    note: '',
  };
}

function buildInitialSettlementBankInfoForm(bankInfo = null) {
  return {
    bankId: bankInfo?.bank_id ?? '',
    bankName: bankInfo?.bank_name ?? '',
    accountNumber: bankInfo?.account_number ?? '',
  };
}

function formatDate(value) {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
  }).format(new Date(value));
}

function inferSplitType(expense) {
  if (!expense.splits?.length) {
    return 'equal';
  }

  const equalAmount = expense.amount / expense.splits.length;
  const allNearEqual = expense.splits.every(
    (split) => Math.abs(split.amount - equalAmount) <= 1,
  );

  return allNearEqual ? 'equal' : 'custom';
}

function getMemberDisplayName(member) {
  return member.display_name || member.user_id;
}

function getDefaultPayerId(activeMembers, currentUserId) {
  if (activeMembers.some((member) => member.user_id === currentUserId)) {
    return currentUserId;
  }

  return activeMembers[0]?.user_id || '';
}

function buildSplitDraft(members, expense) {
  const activeMembers = members.filter((member) => member.status === 'active');
  const existingSplits = new Map(
    (expense?.splits ?? []).map((split) => [split.user_id, split]),
  );
  const draftMembers = existingSplits.size > 0
    ? activeMembers.filter((member) => existingSplits.has(member.user_id))
    : activeMembers;

  return draftMembers.map((member) => {
    const existingSplit = existingSplits.get(member.user_id);

    return {
      user_id: member.user_id,
      display_name: getMemberDisplayName(member),
      amount: existingSplit?.amount?.toString() ?? '',
      percentage: '',
    };
  });
}

function syncSplitsToSelection(activeMembers, currentSplits, selectedUserIds) {
  const currentSplitMap = new Map(currentSplits.map((split) => [split.user_id, split]));

  return activeMembers
    .filter((member) => selectedUserIds.has(member.user_id))
    .map((member) => {
      const currentSplit = currentSplitMap.get(member.user_id);

      return {
        user_id: member.user_id,
        display_name: getMemberDisplayName(member),
        amount: currentSplit?.amount ?? '',
        percentage: currentSplit?.percentage ?? '',
      };
    });
}

function formatPercentageDelta(value) {
  const normalizedValue = Math.round((value + Number.EPSILON) * 100) / 100;

  return `${normalizedValue}%`;
}

function getSplitValidation(formState) {
  const amount = Number(formState.amount);

  if (!amount || amount <= 0) {
    return { isValid: false, message: 'Nhập số tiền lớn hơn 0' };
  }

  if (formState.splits.length === 0) {
    return { isValid: false, message: 'Chọn ít nhất một thành viên chia tiền' };
  }

  if (!formState.splits.some((split) => split.user_id === formState.paidBy)) {
    return { isValid: false, message: 'Người thanh toán phải tham gia chia tiền' };
  }

  if (formState.splitType === 'custom') {
    const totalAmount = formState.splits.reduce(
      (sum, split) => sum + Number(split.amount || 0),
      0,
    );
    const delta = amount - totalAmount;

    if (Math.abs(delta) > 1) {
      return {
        isValid: false,
        message: delta > 0
          ? `Còn thiếu ${formatCurrency(delta)}`
          : `Đang dư ${formatCurrency(Math.abs(delta))}`,
      };
    }
  }

  if (formState.splitType === 'percentage') {
    const totalPercentage = formState.splits.reduce(
      (sum, split) => sum + Number(split.percentage || 0),
      0,
    );
    const delta = 100 - totalPercentage;

    if (Math.abs(delta) > 0.01) {
      return {
        isValid: false,
        message: delta > 0
          ? `Còn thiếu ${formatPercentageDelta(delta)}`
          : `Đang dư ${formatPercentageDelta(Math.abs(delta))}`,
      };
    }
  }

  return { isValid: true, message: '' };
}

function buildParticipantSummary(splits) {
  if (!splits?.length) {
    return '';
  }

  return splits
    .map((split) => split.display_name || split.user_id)
    .join(', ');
}

function buildExpensePayload(formState, { includePaidBy = true } = {}) {
  const amount = Number(formState.amount);
  const payload = {
    title: formState.title.trim(),
    amount,
    category: formState.category,
    date: formState.date,
    split_type: formState.splitType,
    note: formState.note.trim(),
  };

  if (includePaidBy) {
    payload.paid_by = formState.paidBy;
  }

  if (formState.splitType === 'equal') {
    payload.splits = formState.splits.map((split) => ({
      user_id: split.user_id,
    }));
  }

  if (formState.splitType === 'custom') {
    payload.splits = formState.splits.map((split) => ({
      user_id: split.user_id,
      amount: Number(split.amount),
    }));
  }

  if (formState.splitType === 'percentage') {
    payload.splits = formState.splits.map((split) => ({
      user_id: split.user_id,
      percentage: Number(split.percentage),
    }));
  }

  if (!formState.receipt) {
    return payload;
  }

  const formData = new FormData();
  formData.append('title', payload.title);
  formData.append('amount', String(payload.amount));
  if (payload.paid_by) {
    formData.append('paid_by', payload.paid_by);
  }
  formData.append('category', payload.category);
  formData.append('date', payload.date);
  formData.append('split_type', payload.split_type);
  if (payload.note) {
    formData.append('note', payload.note);
  }
  if (payload.splits) {
    formData.append('splits', JSON.stringify(payload.splits));
  }
  formData.append('receipt', formState.receipt);

  return formData;
}

export function GroupFinancePage() {
  const { id = '' } = useParams();
  const currentUser = useAuthStore((state) => state.user);
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [settlementBankInfo, setSettlementBankInfo] = useState(null);
  const [banks, setBanks] = useState([]);
  const [expenseMeta, setExpenseMeta] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isSavingExpense, setIsSavingExpense] = useState(false);
  const [isSavingSettlement, setIsSavingSettlement] = useState(false);
  const [isSavingSettlementBankInfo, setIsSavingSettlementBankInfo] = useState(false);
  const [isDeletingSettlementBankInfo, setIsDeletingSettlementBankInfo] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState('');
  const [expenseFormState, setExpenseFormState] = useState(buildInitialExpenseForm());
  const [settlementFormState, setSettlementFormState] = useState(buildInitialSettlementForm());
  const [settlementBankInfoFormState, setSettlementBankInfoFormState] = useState(
    buildInitialSettlementBankInfoForm(),
  );
  const expenseFormRef = useRef(null);
  const expenseTitleInputRef = useRef(null);

  const activeMembers = useMemo(
    () => members.filter((member) => member.status === 'active'),
    [members],
  );

  useEffect(() => {
    if (!expenseFormState.paidBy && activeMembers.length > 0) {
      const defaultPayerId = getDefaultPayerId(activeMembers, currentUser?.id);

      setExpenseFormState((current) => ({
        ...current,
        paidBy: defaultPayerId,
        splits: buildSplitDraft(activeMembers),
      }));
    }
  }, [activeMembers, currentUser?.id, expenseFormState.paidBy]);

  const splitValidation = useMemo(
    () => getSplitValidation(expenseFormState),
    [expenseFormState],
  );
  const isGroupLeader = group?.my_role === 'leader';
  const canRecordSelectedSettlement =
    isGroupLeader || settlementFormState.fromUser === currentUser?.id;
  const isSettlementReady =
    Boolean(settlementFormState.fromUser) &&
    Boolean(settlementFormState.toUser) &&
    settlementFormState.fromUser !== settlementFormState.toUser &&
    Number(settlementFormState.amount) > 0 &&
    canRecordSelectedSettlement;

  const canCurrentUserRecordSettlementFrom = useCallback(
    (userId) => isGroupLeader || userId === currentUser?.id,
    [currentUser?.id, isGroupLeader],
  );

  useEffect(() => {
    if (isGroupLeader || !currentUser?.id) {
      return;
    }

    if (!activeMembers.some((member) => member.user_id === currentUser.id)) {
      return;
    }

    if (settlementFormState.fromUser === currentUser.id) {
      return;
    }

    setSettlementFormState((current) => ({
      ...current,
      fromUser: currentUser.id,
    }));
  }, [activeMembers, currentUser?.id, isGroupLeader, settlementFormState.fromUser]);

  const loadFinanceWorkspace = useCallback(async () => {
    const [
      groupData,
      membersData,
      expensesData,
      balancesData,
      suggestionsData,
      settlementsData,
      settlementBankInfoData,
      banksData,
    ] =
      await Promise.all([
        getGroupDetail(id),
        listGroupMembers(id),
        listExpenses(id),
        getGroupBalances(id),
        getSettlementSuggestions(id),
        listSettlements(id),
        getMySettlementBankInfo(id),
        listBanks(),
      ]);

    setGroup(groupData);
    setMembers(membersData);
    setExpenses(expensesData.data);
    setExpenseMeta(expensesData.meta);
    setBalances(balancesData);
    setSuggestions(suggestionsData.suggestions ?? []);
    setSettlements(settlementsData);
    setSettlementBankInfo(settlementBankInfoData);
    setBanks(banksData);
    setSettlementBankInfoFormState(buildInitialSettlementBankInfoForm(settlementBankInfoData));
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    async function loadPage() {
      try {
        setIsLoading(true);
        setLoadError('');
        await loadFinanceWorkspace();
      } catch (error) {
        if (!cancelled) {
          setLoadError(error.response?.data?.error?.message ?? 'Không tải được dữ liệu tài chính.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadPage();

    return () => {
      cancelled = true;
    };
  }, [loadFinanceWorkspace]);


  function resetExpenseForm() {
    const defaultPayerId = getDefaultPayerId(activeMembers, currentUser?.id);

    setEditingExpenseId('');
    setExpenseFormState({
      ...buildInitialExpenseForm(),
      paidBy: defaultPayerId,
      splits: buildSplitDraft(activeMembers),
    });
  }

  async function handleSubmitExpense(event) {
    event.preventDefault();

    if (!splitValidation.isValid) {
      toast.error(splitValidation.message);
      return;
    }

    try {
      setIsSavingExpense(true);
      const payload = buildExpensePayload(expenseFormState, {
        includePaidBy: !editingExpenseId,
      });

      if (editingExpenseId) {
        await updateExpense(id, editingExpenseId, payload);
        toast.success('Đã cập nhật khoản chi');
      } else {
        await createExpense(id, payload);
        toast.success('Đã thêm khoản chi mới');
      }

      await loadFinanceWorkspace();
      resetExpenseForm();
    } catch (error) {
      toast.error(error.response?.data?.error?.message ?? 'Không lưu được khoản chi.');
    } finally {
      setIsSavingExpense(false);
    }
  }

  async function handleEditExpense(expenseId) {
    try {
      const expense = await getExpenseDetail(id, expenseId);
      const splitType = inferSplitType(expense);

      setEditingExpenseId(expenseId);
      setExpenseFormState({
        title: expense.title,
        amount: String(expense.amount),
        paidBy: expense.paid_by.user_id,
        category: expense.category,
        date: expense.date,
        note: expense.note || '',
        splitType,
        receipt: null,
        splits: buildSplitDraft(activeMembers, expense),
      });
      expenseFormRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
      expenseTitleInputRef.current?.focus();
    } catch (error) {
      toast.error(error.response?.data?.error?.message ?? 'Không tải được chi tiết khoản chi.');
    }
  }

  function handleSelectAllParticipants() {
    setExpenseFormState((current) => {
      const selectedUserIds = new Set(activeMembers.map((member) => member.user_id));

      return {
        ...current,
        splits: syncSplitsToSelection(activeMembers, current.splits, selectedUserIds),
      };
    });
  }

  function handleToggleParticipant(userId, checked) {
    setExpenseFormState((current) => {
      const selectedUserIds = new Set(current.splits.map((split) => split.user_id));

      if (checked) {
        selectedUserIds.add(userId);
      } else {
        selectedUserIds.delete(userId);
      }

      selectedUserIds.add(current.paidBy);

      return {
        ...current,
        splits: syncSplitsToSelection(activeMembers, current.splits, selectedUserIds),
      };
    });
  }

  async function handleDeleteExpense(expenseId) {
    try {
      await deleteExpense(id, expenseId);
      toast.success('Đã xóa khoản chi');
      await loadFinanceWorkspace();

      if (editingExpenseId === expenseId) {
        resetExpenseForm();
      }
    } catch (error) {
      toast.error(error.response?.data?.error?.message ?? 'Không xóa được khoản chi.');
    }
  }

  async function handleSubmitSettlement(event) {
    event.preventDefault();

    if (!canRecordSelectedSettlement) {
      toast.error('Bạn chỉ có thể ghi nhận khoản thanh toán do chính bạn trả.');
      return;
    }

    try {
      setIsSavingSettlement(true);
      await createSettlement(id, {
        from_user: settlementFormState.fromUser,
        to_user: settlementFormState.toUser,
        amount: Number(settlementFormState.amount),
        note: settlementFormState.note.trim(),
      });
      toast.success('Đã ghi nhận thanh toán');
      await loadFinanceWorkspace();
      setSettlementFormState(buildInitialSettlementForm());
    } catch (error) {
      toast.error(error.response?.data?.error?.message ?? 'Không ghi nhận được thanh toán.');
    } finally {
      setIsSavingSettlement(false);
    }
  }

  async function handleSubmitSettlementBankInfo(event) {
    event.preventDefault();

    const accountNumber = settlementBankInfoFormState.accountNumber.trim();

    if (
      !settlementBankInfoFormState.bankId.trim() ||
      accountNumber.length < 4 ||
      !/^[0-9]+$/.test(accountNumber)
    ) {
      toast.error('Vui lòng chọn ngân hàng và nhập số tài khoản hợp lệ.');
      return;
    }

    const payload = {
      bank_id: settlementBankInfoFormState.bankId.trim(),
      account_number: accountNumber,
    };

    try {
      setIsSavingSettlementBankInfo(true);
      const updatedBankInfo = await updateMySettlementBankInfo(id, payload);

      setSettlementBankInfo(updatedBankInfo);
      setSettlementBankInfoFormState(buildInitialSettlementBankInfoForm(updatedBankInfo));
      toast.success('Đã lưu tài khoản nhận tiền cho nhóm này');
    } catch (error) {
      toast.error(error.response?.data?.error?.message ?? 'Không lưu được tài khoản nhận tiền.');
    } finally {
      setIsSavingSettlementBankInfo(false);
    }
  }

  async function handleDeleteSettlementBankInfo() {
    try {
      setIsDeletingSettlementBankInfo(true);
      await deleteMySettlementBankInfo(id);

      setSettlementBankInfo(null);
      setSettlementBankInfoFormState(buildInitialSettlementBankInfoForm());
      toast.success('Đã xóa tài khoản nhận tiền khỏi nhóm này');
    } catch (error) {
      toast.error(error.response?.data?.error?.message ?? 'Không xóa được tài khoản nhận tiền.');
    } finally {
      setIsDeletingSettlementBankInfo(false);
    }
  }

  if (isLoading) {
    return (
      <PageContainer
        eyebrow="Tài chính nhóm"
        title="Đang tải dữ liệu tài chính"
        description="Đang đồng bộ các khoản chi tiêu, số dư và lịch sử thanh toán của nhóm."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-28 animate-shimmer rounded-xl"
            />
          ))}
        </div>
      </PageContainer>
    );
  }

  if (loadError) {
    return (
      <PageContainer
        eyebrow="Tài chính nhóm"
        title="Không gian tài chính"
        description="Không tải được dữ liệu tài chính cho nhóm này."
      >
        <SurfaceCard title="Có lỗi xảy ra">
          <ErrorState
            message={loadError}
            onRetry={() => {
              setLoadError('');
              setIsLoading(true);
              void loadFinanceWorkspace()
                .catch((error) => {
                  setLoadError(
                    error.response?.data?.error?.message ?? 'Không tải được dữ liệu tài chính.',
                  );
                })
                .finally(() => {
                  setIsLoading(false);
                });
            }}
            actionLabel="Tải lại không gian"
          />
        </SurfaceCard>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      eyebrow="Chia bill"
      title={group ? `Chia bill - ${group.name}` : 'Chia bill nhóm'}
      description="Ghi khoản chi, chia phần cho từng người và chốt nhanh ai cần chuyển cho ai."
      actions={
        <div className="flex flex-wrap gap-3">
          <Link
            to="/expenses"
            className="rounded-xl app-button-secondary"
          >
            Về danh sách chi tiêu
          </Link>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          label="Tổng đã chi"
          value={formatCurrency(balances?.total_expenses ?? 0)}
          hint="Tất cả khoản chi đã ghi trong nhóm."
        />
        <KpiTile
          label="Số dư của bạn"
          value={
            formatCurrency(
              balances?.balances?.find((item) => item.user_id === currentUser?.id)?.balance ?? 0,
            )
          }
          hint="Dương là được nhận lại, âm là cần trả thêm."
        />
        <KpiTile
          label="Gợi ý chuyển"
          value={String(suggestions.length)}
          hint="Cách chuyển ít bước nhất để cân bằng."
        />
        <KpiTile
          label="Trạng thái"
          value={balances?.is_settled ? 'Đã cân bằng' : 'Chưa cân bằng'}
          hint={expenseMeta ? `Đã ghi ${expenseMeta.total} khoản chi` : 'Chưa có dữ liệu chi tiêu'}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-6">
          <SurfaceCard
            title={editingExpenseId ? 'Sửa khoản chi' : 'Ghi khoản chi'}
            description="Nhập số tiền, người cùng chia và cách chia. Người trả tiền hiện là tài khoản của bạn."
          >
            <form ref={expenseFormRef} className="grid gap-4" onSubmit={handleSubmitExpense}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Tiêu đề khoản chi
                  <input
                    ref={expenseTitleInputRef}
                    aria-label="expense-title"
                    type="text"
                    required
                    value={expenseFormState.title}
                    onChange={(event) =>
                      setExpenseFormState((current) => ({ ...current, title: event.target.value }))
                    }
                    className="rounded-xl app-input"
                    placeholder="Ví dụ: Tiền ăn tối, Tiền xăng xe..."
                  />
                </label>

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Số tiền (VND)
                  <input
                    aria-label="expense-amount"
                    type="number"
                    min="1"
                    required
                    value={expenseFormState.amount}
                    onChange={(event) =>
                      setExpenseFormState((current) => ({ ...current, amount: event.target.value }))
                    }
                    className="rounded-xl app-input"
                    placeholder="Ví dụ: 850000"
                  />
                </label>

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Người thanh toán
                  <select
                    aria-label="expense-payer"
                    value={expenseFormState.paidBy}
                    disabled
                    className="rounded-xl app-input"
                  >
                    {activeMembers.map((member) => (
                      <option key={member.user_id} value={member.user_id}>
                        {member.display_name || member.user_id}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Danh mục chi tiêu
                  <select
                    value={expenseFormState.category}
                    onChange={(event) =>
                      setExpenseFormState((current) => ({
                        ...current,
                        category: event.target.value,
                      }))
                    }
                    className="rounded-xl app-input"
                  >
                    {categories.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Ngày chi tiêu
                  <input
                    type="date"
                    value={expenseFormState.date}
                    onChange={(event) =>
                      setExpenseFormState((current) => ({ ...current, date: event.target.value }))
                    }
                    className="rounded-xl app-input"
                  />
                </label>

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Phương thức chia tiền
                  <select
                    aria-label="expense-split-type"
                    value={expenseFormState.splitType}
                    onChange={(event) =>
                      setExpenseFormState((current) => ({
                        ...current,
                        splitType: event.target.value,
                      }))
                    }
                    className="rounded-xl app-input"
                  >
                    {Object.entries(splitTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Ghi chú chi tiết
                <textarea
                  value={expenseFormState.note}
                  onChange={(event) =>
                    setExpenseFormState((current) => ({ ...current, note: event.target.value }))
                  }
                  className="min-h-28 rounded-xl app-input"
                  placeholder="Nhập thông tin chi tiết về khoản chi này..."
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Hóa đơn / Chứng từ thanh toán
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    setExpenseFormState((current) => ({
                      ...current,
                      receipt: event.target.files?.[0] ?? null,
                    }))
                  }
                  className="rounded-xl border border-dashed border-[#d1fadf] bg-[#f7fdf9] px-4 py-3 text-sm text-slate-600"
                />
              </label>

              <div className="grid gap-3 rounded-xl border border-[#d1fadf] bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Người tham gia chia tiền
                    </p>
                    <p className="text-xs text-slate-500">
                      Người thanh toán luôn bắt buộc nằm trong danh sách này.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSelectAllParticipants}
                    className="rounded-xl border border-[#d1fadf] bg-[#f7fdf9] px-4 py-2 text-sm font-semibold text-[#0b7443] transition hover:bg-[#e1fdea]"
                  >
                    Chọn tất cả
                  </button>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {activeMembers.map((member) => {
                    const isChecked = expenseFormState.splits.some(
                      (split) => split.user_id === member.user_id,
                    );
                    const isPayer = member.user_id === expenseFormState.paidBy;

                    return (
                      <label
                        key={member.user_id}
                        className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition ${
                          isChecked
                            ? 'border-[#0b7443] bg-[#f7fdf9] text-slate-900'
                            : 'border-slate-200 bg-white text-slate-600'
                        }`}
                      >
                        <input
                          aria-label={getMemberDisplayName(member)}
                          type="checkbox"
                          checked={isChecked}
                          disabled={isPayer}
                          onChange={(event) =>
                            handleToggleParticipant(member.user_id, event.target.checked)
                          }
                          className="size-4 accent-[#0b7443]"
                        />
                        <span>{getMemberDisplayName(member)}</span>
                        {isPayer ? (
                          <span className="ml-auto rounded-full bg-[#d1fadf] px-2 py-1 text-xs text-[#0b7443]">
                            Người trả
                          </span>
                        ) : null}
                      </label>
                    );
                  })}
                </div>
              </div>

              {expenseFormState.splitType !== 'equal' ? (
                <div className="grid gap-3 rounded-xl border border-[#d1fadf] bg-[#f7fdf9] p-4">
                  {expenseFormState.splits.map((split, index) => (
                    <div key={split.user_id} className="grid gap-3 md:grid-cols-[1fr_180px]">
                      <div className="rounded-xl bg-white px-4 py-3 text-sm font-medium text-slate-900">
                        {split.display_name}
                      </div>
                      <input
                        type="number"
                        min="0"
                        step={expenseFormState.splitType === 'percentage' ? '0.01' : '1'}
                        value={
                          expenseFormState.splitType === 'percentage'
                            ? split.percentage
                            : split.amount
                        }
                        onChange={(event) =>
                          setExpenseFormState((current) => ({
                            ...current,
                            splits: current.splits.map((item, itemIndex) =>
                              itemIndex === index
                                ? {
                                    ...item,
                                    [expenseFormState.splitType === 'percentage'
                                      ? 'percentage'
                                      : 'amount']: event.target.value,
                                  }
                                : item,
                            ),
                          }))
                        }
                        className="rounded-xl app-input"
                        placeholder={expenseFormState.splitType === 'percentage' ? '25' : '212500'}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-[#d1fadf] bg-[#f7fdf9] px-4 py-4 text-sm leading-7 text-slate-700">
                  Hệ thống sẽ chia đều khoản tiền này cho các thành viên đã chọn.
                </div>
              )}

              {splitValidation.message ? (
                <p className="rounded-xl bg-[#fee9d1] px-4 py-3 text-sm font-semibold text-[#715039]">
                  {splitValidation.message}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isSavingExpense || !splitValidation.isValid}
                  className="rounded-xl app-button-primary"
                >
                  {isSavingExpense
                    ? 'Đang lưu...'
                    : editingExpenseId
                      ? 'Cập nhật khoản chi'
                      : 'Lưu khoản chi'}
                </button>
                {editingExpenseId ? (
                  <button
                    type="button"
                    onClick={resetExpenseForm}
                    className="rounded-xl border border-[#d1fadf] bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-[#f7fdf9]"
                  >
                    Hủy sửa
                  </button>
                ) : null}
              </div>
            </form>
          </SurfaceCard>

          <SurfaceCard
            title="Các khoản chi"
            description="Khoản mới nằm trên cùng. Người tạo hoặc Trưởng nhóm có thể sửa, xóa khi cần."
          >
            {expenses.length === 0 ? (
              <EmptyState
                title="Chưa có khoản chi nào"
                description="Ghi khoản đầu tiên để SplitBill bắt đầu tính số dư cho nhóm."
              />
            ) : (
              <div className="grid gap-3">
                {expenses.map((expense) => (
                  <article
                    key={expense.id}
                    className="rounded-xl border border-[#d1fadf] bg-[#f7fdf9] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0b7443]">
                          {categories.find((category) => category.value === expense.category)?.label ||
                            expense.category}
                        </p>
                        <h3 className="mt-2 text-lg font-semibold text-slate-900">{expense.title}</h3>
                        <p className="mt-1 text-sm text-slate-600">
                          {expense.paid_by.display_name} - {formatDate(expense.date)}
                        </p>
                        {buildParticipantSummary(expense.splits) ? (
                          <p className="mt-1 text-sm font-medium text-slate-700">
                            Chia cho: {buildParticipantSummary(expense.splits)}
                          </p>
                        ) : null}
                      </div>
                      <p className="text-xl font-semibold text-slate-900">
                        {formatCurrency(expense.amount)}
                      </p>
                    </div>

                    {expense.note ? (
                      <p className="mt-3 text-sm leading-7 text-slate-700">{expense.note}</p>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => handleEditExpense(expense.id)}
                        className="rounded-xl app-button-secondary"
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteExpense(expense.id)}
                        className="rounded-xl app-button-danger"
                      >
                        Xóa
                      </button>
                      {expense.receipt_url ? (
                        <a
                          href={expense.receipt_url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-xl border border-[#c7e0f8] bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-[#eef6ff]"
                        >
                          Xem hóa đơn
                        </a>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </SurfaceCard>
        </div>

        <div className="grid gap-6">
          <SurfaceCard
            title="Ai đang nợ ai"
            description="Số dương là được nhận lại, số âm là cần trả thêm."
          >
            {balances?.balances?.length ? (
              <div className="grid gap-3">
                {balances.balances.map((member) => (
                  <article
                    key={member.user_id}
                    className="rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          avatarUrl={member.avatar_url}
                          userId={member.user_id}
                          groupId={id}
                          displayName={member.display_name || member.user_id || 'Thành viên'}
                          size="sm"
                        />
                        <div>
                          <p className="font-semibold text-slate-900">
                            {member.display_name || member.user_id}
                          </p>
                          <p className="text-sm text-slate-500">
                            Số dư
                          </p>
                        </div>
                      </div>
                      <p
                        className={`text-lg font-semibold ${
                          member.balance > 0
                            ? 'text-[#0b7443]'
                            : member.balance < 0
                              ? 'text-rose-700'
                              : 'text-slate-700'
                        }`}
                      >
                        {formatCurrency(member.balance)}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </SurfaceCard>

          <SurfaceCard
            title="Tài khoản nhận chuyển khoản"
            description="Thông tin này chỉ dùng trong nhóm hiện tại để người khác chuyển tiền khi chốt bill."
          >
            <form className="grid gap-4" onSubmit={handleSubmitSettlementBankInfo}>
              <div className="rounded-xl border border-[#d1fadf] bg-[#f7fdf9] px-4 py-3 text-sm text-slate-700">
                {settlementBankInfo
                  ? 'Đã có tài khoản nhận tiền cho nhóm này. Bạn có thể cập nhật hoặc xóa bất cứ lúc nào.'
                  : 'Chưa có tài khoản nhận tiền cho nhóm này.'}
              </div>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Ngân hàng
                <select
                  aria-label="settlement-bank-id"
                  required
                  value={settlementBankInfoFormState.bankId}
                  onChange={(event) => {
                    const selectedBank = banks.find((bank) => bank.bank_id === event.target.value);
                    setSettlementBankInfoFormState((current) => ({
                      ...current,
                      bankId: event.target.value,
                      bankName: selectedBank?.bank_name ?? '',
                    }));
                  }}
                  className="rounded-xl app-input"
                >
                  <option value="">Chọn ngân hàng</option>
                  {banks.map((bank) => (
                    <option key={bank.bank_id} value={bank.bank_id}>
                      {bank.bank_name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Số tài khoản
                <input
                  aria-label="settlement-account-number"
                  type="text"
                  required
                  value={settlementBankInfoFormState.accountNumber}
                  onChange={(event) => {
                    setSettlementBankInfoFormState((current) => ({
                      ...current,
                      accountNumber: event.target.value,
                    }));
                  }}
                  className="rounded-xl app-input font-mono"
                  placeholder="Ví dụ: 123456789"
                />
              </label>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={
                    isSavingSettlementBankInfo ||
                    !settlementBankInfoFormState.bankId.trim() ||
                    !/^[0-9]{4,32}$/.test(settlementBankInfoFormState.accountNumber.trim())
                  }
                  className="rounded-xl app-button-primary"
                >
                  {isSavingSettlementBankInfo ? 'Đang lưu...' : 'Lưu tài khoản nhận tiền'}
                </button>
                <button
                  type="button"
                  disabled={!settlementBankInfo || isDeletingSettlementBankInfo}
                  onClick={handleDeleteSettlementBankInfo}
                  className="rounded-xl app-button-danger"
                >
                  {isDeletingSettlementBankInfo
                    ? 'Đang xóa...'
                    : 'Xóa tài khoản khỏi nhóm này'}
                </button>
              </div>
            </form>
          </SurfaceCard>

          <SurfaceCard
            title="Gợi ý chuyển khoản"
            description="SplitBill gom nợ thành ít giao dịch nhất có thể."
          >
            {suggestions.length === 0 ? (
              <EmptyState
                title="Không cần chuyển thêm"
                description="Số dư của nhóm đang cân bằng."
              />
            ) : (
              <div className="grid gap-3">
                {suggestions.map((suggestion, index) => {
                  const recipientBankInfo = suggestion.to.settlement_bank_info;

                  return (
                    <article
                      key={`${suggestion.from.user_id}-${suggestion.to.user_id}-${index}`}
                      className="rounded-xl border border-[#d1fadf] bg-[#f7fdf9] p-4"
                    >
                      <p className="text-sm leading-7 text-slate-700">
                        <span className="font-semibold text-slate-900">{suggestion.from.display_name}</span>{' '}
                        chuyển cho{' '}
                        <span className="font-semibold text-slate-900">{suggestion.to.display_name}</span>
                      </p>
                      <p className="mt-2 text-lg font-semibold text-[#0b7443]">
                        {formatCurrency(suggestion.amount)}
                      </p>

                      {recipientBankInfo && suggestion.to.qr_url ? (
                        <div className="mt-4 grid gap-3 rounded-xl border border-white bg-white p-3">
                          <img
                            src={suggestion.to.qr_url}
                            alt={`QR chuyển khoản cho ${suggestion.to.display_name}`}
                            className="mx-auto size-44 rounded-xl border border-[#d1fadf] bg-white object-contain"
                          />
                          <div className="grid gap-1 rounded-xl bg-[#f7fdf9] px-3 py-2 text-sm">
                            <p className="font-semibold text-slate-900">
                              {recipientBankInfo.bank_name}
                            </p>
                            <p className="font-mono text-slate-700">
                              {recipientBankInfo.account_number}
                            </p>
                            {recipientBankInfo.account_name ? (
                              <p className="font-semibold text-slate-700">
                                {recipientBankInfo.account_name}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <p className="mt-4 rounded-xl border border-dashed border-[#d1fadf] bg-white px-3 py-2 text-sm text-slate-600">
                          Người nhận chưa nhập thông tin ngân hàng cho nhóm này.
                        </p>
                      )}

                      <button
                        type="button"
                        disabled={!canCurrentUserRecordSettlementFrom(suggestion.from.user_id)}
                        onClick={() => {
                          if (!canCurrentUserRecordSettlementFrom(suggestion.from.user_id)) {
                            return;
                          }

                          setSettlementFormState({
                            fromUser: suggestion.from.user_id,
                            toUser: suggestion.to.user_id,
                            amount: String(suggestion.amount),
                            note: '',
                          });
                        }}
                        className="mt-3 rounded-xl app-button-secondary"
                      >
                        {canCurrentUserRecordSettlementFrom(suggestion.from.user_id)
                          ? 'Điền vào form thanh toán'
                          : 'Chỉ người trả nợ mới được ghi nhận'}
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </SurfaceCard>

          <SurfaceCard
            title="Xác nhận đã trả"
            description="Chỉ ghi khi tiền đã được chuyển hoặc nhận thật. Bản ghi này không sửa sau khi lưu."
          >
            <form className="grid gap-4" onSubmit={handleSubmitSettlement}>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Người trả nợ
                <select
                  aria-label="settlement-from-user"
                  value={settlementFormState.fromUser}
                  disabled={!isGroupLeader}
                  onChange={(event) =>
                    setSettlementFormState((current) => ({
                      ...current,
                      fromUser: event.target.value,
                    }))
                  }
                  className="rounded-xl app-input"
                >
                  <option value="">Chọn người trả nợ</option>
                  {activeMembers.map((member) => (
                    <option key={member.user_id} value={member.user_id}>
                      {member.display_name || member.user_id}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Người nhận thanh toán
                <select
                  aria-label="settlement-to-user"
                  value={settlementFormState.toUser}
                  onChange={(event) =>
                    setSettlementFormState((current) => ({
                      ...current,
                      toUser: event.target.value,
                    }))
                  }
                  className="rounded-xl app-input"
                >
                  <option value="">Chọn người nhận thanh toán</option>
                  {activeMembers.map((member) => (
                    <option key={member.user_id} value={member.user_id}>
                      {member.display_name || member.user_id}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Số tiền thanh toán
                <input
                  aria-label="settlement-amount"
                  type="number"
                  min="1"
                  value={settlementFormState.amount}
                  onChange={(event) =>
                    setSettlementFormState((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                  className="rounded-xl app-input"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Ghi chú
                <textarea
                  value={settlementFormState.note}
                  onChange={(event) =>
                    setSettlementFormState((current) => ({
                      ...current,
                      note: event.target.value,
                    }))
                  }
                  className="min-h-24 rounded-xl app-input"
                  placeholder="Ví dụ: Đã chuyển khoản qua ngân hàng"
                />
              </label>

              <button
                type="submit"
                disabled={isSavingSettlement || !isSettlementReady}
                className="rounded-xl app-button-primary"
              >
                {isSavingSettlement ? 'Đang ghi nhận...' : 'Xác nhận thanh toán'}
              </button>
            </form>
          </SurfaceCard>

          <SurfaceCard
            title="Lịch sử trả nợ"
            description="Các lần thành viên đã xác nhận thanh toán cho nhau."
          >
            {settlements.length === 0 ? (
              <EmptyState
                title="Chưa có lần trả nợ nào"
                description="Khi có người xác nhận đã trả, lịch sử sẽ xuất hiện ở đây."
              />
            ) : (
              <div className="grid gap-3">
                {settlements.map((settlement) => (
                  <article
                    key={settlement.id}
                    className="rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <p className="font-semibold text-slate-900">
                      {settlement.from_user.display_name}
                      {' âž” '}
                      {settlement.to_user.display_name}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-[#0b7443]">
                      {formatCurrency(settlement.amount)}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      {formatDate(settlement.settled_at)} - ghi bởi{' '}
                      {settlement.recorded_by.display_name}
                    </p>
                    {settlement.note ? (
                      <p className="mt-2 text-sm leading-7 text-slate-700">{settlement.note}</p>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </SurfaceCard>
        </div>
      </div>
    </PageContainer>
  );
}
