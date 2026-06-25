import { getTodayInputValue } from '../../utils/dateTime';

export const paymentFrequencyLabels = {
  one_time: 'Một lần',
  weekly: 'Hằng tuần',
  biweekly: 'Hai tuần',
  monthly: 'Hằng tháng',
};

export const statusTone = {
  paid: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  late: 'border-rose-200 bg-rose-50 text-rose-700',
  kicked: 'border-slate-200 bg-slate-100 text-slate-600',
};

export const statusLabel = {
  paid: 'Đã đóng đủ',
  pending: 'Đang chờ đóng',
  late: 'Trễ hạn',
  kicked: 'Đã rời nhóm (miễn trừ)',
};

export function buildInitialCampaignForm() {
  return {
    title: '',
    description: '',
    amountPerPerson: '',
    paymentFrequency: 'one_time',
    dueDate: '',
  };
}

export function buildInitialQrForm() {
  return {
    bankId: '',
    bankName: '',
    accountNumber: '',
  };
}

export function buildInitialSpendingForm() {
  return {
    title: '',
    amount: '',
    spentAt: getTodayInputValue(),
    note: '',
    receipt: null,
  };
}

export function buildInitialManualForm() {
  return {
    userId: '',
    amount: '',
    note: '',
  };
}
