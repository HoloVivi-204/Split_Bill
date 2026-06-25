import { describe, expect, test } from 'vitest';

import {
  buildConversationPreview,
  formatBadge,
  resolvePrimaryNavTo,
  sortMessagesAscending,
  toLatestMessage,
} from './appShellUtils';

describe('app shell helpers', () => {
  test('formats notification badges with the current cap', () => {
    expect(formatBadge(0)).toBeNull();
    expect(formatBadge(3)).toBe('3');
    expect(formatBadge(6)).toBe('5+');
  });

  test('builds conversation previews from the latest message', () => {
    expect(buildConversationPreview({
      latest_message: {
        content: 'Đã tạo khoản chi',
        type: 'system',
      },
    })).toBe('Đã tạo khoản chi');

    expect(buildConversationPreview({
      latest_message: {
        content: 'Tối nay ăn gì?',
        type: 'text',
        sender: { display_name: 'An' },
      },
    })).toBe('An: Tối nay ăn gì?');
  });

  test('normalizes deleted messages for the chat bubble preview', () => {
    expect(toLatestMessage({
      id: 'msg-1',
      content: 'hidden',
      is_deleted: true,
      type: 'text',
      created_at: '2026-06-23T06:00:00.000Z',
      sender: { id: 'user-1', display_name: 'An' },
    })).toMatchObject({
      id: 'msg-1',
      content: 'Tin nhắn đã bị xoá',
      is_deleted: true,
      sender: {
        user_id: 'user-1',
        display_name: 'An',
      },
    });
  });

  test('sorts messages from oldest to newest without mutating input', () => {
    const messages = [
      { id: 'new', created_at: '2026-06-23T07:00:00.000Z' },
      { id: 'old', created_at: '2026-06-23T06:00:00.000Z' },
    ];

    expect(sortMessagesAscending(messages).map((message) => message.id)).toEqual(['old', 'new']);
    expect(messages.map((message) => message.id)).toEqual(['new', 'old']);
  });

  test('maps nested product routes back to primary navigation tabs', () => {
    expect(resolvePrimaryNavTo('/groups/abc/expenses')).toBe('/expenses');
    expect(resolvePrimaryNavTo('/groups/abc/fund/manage')).toBe('/fund');
    expect(resolvePrimaryNavTo('/account-settings')).toBe('/profile');
  });
});
