import { formatCurrency } from '../../utils/formatCurrency';
import { getTodayInputValue } from '../../utils/dateTime';

export const categories = [
  { value: 'food', label: 'Ăn uống' },
  { value: 'transport', label: 'Di chuyển' },
  { value: 'accommodation', label: 'Lưu trú' },
  { value: 'entertainment', label: 'Giải trí' },
  { value: 'shopping', label: 'Mua sắm' },
  { value: 'other', label: 'Khác' },
];

export const splitTypeLabels = {
  equal: 'Chia đều',
  custom: 'Chia tùy chỉnh',
  percentage: 'Chia theo %',
};

export function buildInitialExpenseForm() {
  return {
    title: '',
    amount: '',
    paidBy: '',
    category: 'food',
    date: getTodayInputValue(),
    note: '',
    splitType: 'equal',
    receipt: null,
    splits: [],
  };
}

export function buildInitialSettlementForm() {
  return {
    fromUser: '',
    toUser: '',
    amount: '',
    note: '',
  };
}

export function buildInitialSettlementBankInfoForm(bankInfo = null) {
  return {
    bankId: bankInfo?.bank_id ?? '',
    bankName: bankInfo?.bank_name ?? '',
    accountNumber: bankInfo?.account_number ?? '',
  };
}

export function inferSplitType(expense) {
  if (!expense.splits?.length) {
    return 'equal';
  }

  const equalAmount = expense.amount / expense.splits.length;
  const allNearEqual = expense.splits.every(
    (split) => Math.abs(split.amount - equalAmount) <= 1,
  );

  return allNearEqual ? 'equal' : 'custom';
}

export function getMemberDisplayName(member) {
  return member.display_name || member.user_id;
}

export function getDefaultPayerId(activeMembers, currentUserId) {
  if (activeMembers.some((member) => member.user_id === currentUserId)) {
    return currentUserId;
  }

  return activeMembers[0]?.user_id || '';
}

export function buildSplitDraft(members, expense) {
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

export function syncSplitsToSelection(activeMembers, currentSplits, selectedUserIds) {
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

export function formatPercentageDelta(value) {
  const normalizedValue = Math.round((value + Number.EPSILON) * 100) / 100;

  return `${normalizedValue}%`;
}

export function getSplitValidation(formState) {
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

export function buildParticipantSummary(splits) {
  if (!splits?.length) {
    return '';
  }

  return splits
    .map((split) => split.display_name || split.user_id)
    .join(', ');
}

export function buildExpensePayload(formState, { includePaidBy = true } = {}) {
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
