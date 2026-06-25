import { describe, expect, test } from 'vitest';

import { buildPreview, sortConversations, sortMessages, upsertMessage } from './chatPageUtils';

describe('chat page helpers', () => {
  test('sorts messages newest first without mutating input', () => {
    const messages = [
      { id: 'old', created_at: '2026-06-23T06:00:00.000Z' },
      { id: 'new', created_at: '2026-06-23T07:00:00.000Z' },
    ];

    expect(sortMessages(messages).map((message) => message.id)).toEqual(['new', 'old']);
    expect(messages.map((message) => message.id)).toEqual(['old', 'new']);
  });

  test('upserts existing messages by id', () => {
    const messages = [
      { id: 'msg-1', content: 'old', created_at: '2026-06-23T06:00:00.000Z' },
    ];

    expect(upsertMessage(messages, {
      id: 'msg-1',
      content: 'new',
      created_at: '2026-06-23T07:00:00.000Z',
    })).toEqual([
      { id: 'msg-1', content: 'new', created_at: '2026-06-23T07:00:00.000Z' },
    ]);
    expect(messages[0].content).toBe('old');
  });

  test('builds stable previews for text and system conversations', () => {
    expect(buildPreview({
      latest_message: {
        type: 'system',
        content: 'An đã tham gia nhóm',
      },
    })).toBe('An đã tham gia nhóm');

    expect(buildPreview({
      latest_message: {
        type: 'text',
        content: 'Chốt bill nhé',
        sender: { display_name: 'Bình' },
      },
    })).toBe('Bình: Chốt bill nhé');
  });

  test('sorts conversations by newest activity', () => {
    const conversations = [
      { id: 'old', created_at: '2026-06-23T06:00:00.000Z' },
      {
        id: 'new',
        created_at: '2026-06-23T05:00:00.000Z',
        latest_message: { created_at: '2026-06-23T07:00:00.000Z' },
      },
    ];

    expect(sortConversations(conversations).map((conversation) => conversation.id)).toEqual([
      'new',
      'old',
    ]);
  });
});
