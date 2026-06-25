import { describe, expect, test } from 'vitest';

import {
  buildExpensePayload,
  buildSplitDraft,
  getDefaultPayerId,
  getSplitValidation,
} from './financeForm';

describe('finance form helpers', () => {
  test('keeps the current user as default payer when they are active', () => {
    const members = [
      { user_id: 'user-1', status: 'active' },
      { user_id: 'user-2', status: 'active' },
    ];

    expect(getDefaultPayerId(members, 'user-2')).toBe('user-2');
  });

  test('builds split drafts from active members only', () => {
    const members = [
      { user_id: 'user-1', display_name: 'An', status: 'active' },
      { user_id: 'user-2', display_name: 'Bình', status: 'left' },
    ];

    expect(buildSplitDraft(members)).toEqual([
      {
        user_id: 'user-1',
        display_name: 'An',
        amount: '',
        percentage: '',
      },
    ]);
  });

  test('rejects a custom split when amounts do not match the expense total', () => {
    const validation = getSplitValidation({
      amount: '100000',
      paidBy: 'user-1',
      splitType: 'custom',
      splits: [
        { user_id: 'user-1', amount: '40000' },
        { user_id: 'user-2', amount: '40000' },
      ],
    });

    expect(validation.isValid).toBe(false);
    expect(validation.message).toContain('Còn thiếu');
  });

  test('builds a percentage split payload without mutating form state', () => {
    const formState = {
      title: 'Ăn tối',
      amount: '200000',
      paidBy: 'user-1',
      category: 'food',
      date: '2026-06-23',
      splitType: 'percentage',
      note: 'Nhóm cuối tuần',
      receipt: null,
      splits: [
        { user_id: 'user-1', percentage: '60' },
        { user_id: 'user-2', percentage: '40' },
      ],
    };

    expect(buildExpensePayload(formState)).toEqual({
      title: 'Ăn tối',
      amount: 200000,
      paid_by: 'user-1',
      category: 'food',
      date: '2026-06-23',
      split_type: 'percentage',
      note: 'Nhóm cuối tuần',
      splits: [
        { user_id: 'user-1', percentage: 60 },
        { user_id: 'user-2', percentage: 40 },
      ],
    });
    expect(formState.splits[0].percentage).toBe('60');
  });
});
