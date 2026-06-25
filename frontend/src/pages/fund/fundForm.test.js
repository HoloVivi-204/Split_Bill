import { describe, expect, test } from 'vitest';

import {
  buildInitialCampaignForm,
  buildInitialManualForm,
  buildInitialQrForm,
  buildInitialSpendingForm,
  paymentFrequencyLabels,
  statusLabel,
} from './fundForm';

describe('fund form helpers', () => {
  test('builds empty fund form states with stable defaults', () => {
    expect(buildInitialCampaignForm()).toMatchObject({
      title: '',
      amountPerPerson: '',
      paymentFrequency: 'one_time',
    });
    expect(buildInitialQrForm()).toEqual({
      bankId: '',
      bankName: '',
      accountNumber: '',
    });
    expect(buildInitialManualForm()).toEqual({
      userId: '',
      amount: '',
      note: '',
    });
    expect(buildInitialSpendingForm()).toMatchObject({
      title: '',
      amount: '',
      note: '',
      receipt: null,
    });
  });

  test('keeps fund status and frequency labels explicit', () => {
    expect(paymentFrequencyLabels.monthly).toBe('Hằng tháng');
    expect(statusLabel.paid).toBe('Đã đóng đủ');
    expect(statusLabel.late).toBe('Trễ hạn');
  });
});
