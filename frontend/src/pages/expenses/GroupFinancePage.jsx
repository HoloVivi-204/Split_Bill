import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useParams } from 'react-router-dom';

import {
  createExpense,
  deleteExpense,
  getExpenseDetail,
  listExpenses,
  updateExpense,
} from '../../api/expenses';
import { listBanks } from '../../api/banks';
import {
  getGroupDetail,
  listGroupMembers,
} from '../../api/group-core';
import {
  createSettlement,
  deleteMySettlementBankInfo,
  getGroupBalances,
  getMySettlementBankInfo,
  getSettlementSuggestions,
  listSettlements,
  updateMySettlementBankInfo,
} from '../../api/settlements';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { KpiTile } from '../../components/common/KpiTile';
import { PageContainer } from '../../components/common/PageContainer';
import { SurfaceCard } from '../../components/common/SurfaceCard';
import { useAuthStore } from '../../stores/authStore';
import { getApiErrorMessage } from '../../utils/apiError';
import { formatCurrency } from '../../utils/formatCurrency';
import { GroupExpenseList } from './GroupExpenseList';
import { GroupFinanceSidebar } from './GroupFinanceSidebar';
import {
  buildExpensePayload,
  buildInitialExpenseForm,
  buildInitialSettlementBankInfoForm,
  buildInitialSettlementForm,
  buildParticipantSummary,
  buildSplitDraft,
  categories,
  getDefaultPayerId,
  getMemberDisplayName,
  getSplitValidation,
  inferSplitType,
  splitTypeLabels,
  syncSplitsToSelection,
} from './financeForm';

function formatDate(value) {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
  }).format(new Date(value));
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
          setLoadError(getApiErrorMessage(error, 'Không tải được dữ liệu tài chính.'));
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
      toast.error(getApiErrorMessage(error, 'Không lưu được khoản chi.'));
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
      toast.error(getApiErrorMessage(error, 'Không tải được chi tiết khoản chi.'));
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
      toast.error(getApiErrorMessage(error, 'Không xóa được khoản chi.'));
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
      toast.error(getApiErrorMessage(error, 'Không ghi nhận được thanh toán.'));
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
      toast.error(getApiErrorMessage(error, 'Không lưu được tài khoản nhận tiền.'));
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
      toast.error(getApiErrorMessage(error, 'Không xóa được tài khoản nhận tiền.'));
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
                    getApiErrorMessage(error, 'Không tải được dữ liệu tài chính.'),
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

          <GroupExpenseList
            buildParticipantSummary={buildParticipantSummary}
            categories={categories}
            expenses={expenses}
            formatDate={formatDate}
            handleDeleteExpense={handleDeleteExpense}
            handleEditExpense={handleEditExpense}
          />
        </div>

        <GroupFinanceSidebar
          activeMembers={activeMembers}
          balances={balances}
          banks={banks}
          canCurrentUserRecordSettlementFrom={canCurrentUserRecordSettlementFrom}
          formatDate={formatDate}
          groupId={id}
          handleDeleteSettlementBankInfo={handleDeleteSettlementBankInfo}
          handleSubmitSettlement={handleSubmitSettlement}
          handleSubmitSettlementBankInfo={handleSubmitSettlementBankInfo}
          isDeletingSettlementBankInfo={isDeletingSettlementBankInfo}
          isGroupLeader={isGroupLeader}
          isSavingSettlement={isSavingSettlement}
          isSavingSettlementBankInfo={isSavingSettlementBankInfo}
          isSettlementReady={isSettlementReady}
          setSettlementBankInfoFormState={setSettlementBankInfoFormState}
          setSettlementFormState={setSettlementFormState}
          settlementBankInfo={settlementBankInfo}
          settlementBankInfoFormState={settlementBankInfoFormState}
          settlementFormState={settlementFormState}
          settlements={settlements}
          suggestions={suggestions}
        />
      </div>
    </PageContainer>
  );
}
