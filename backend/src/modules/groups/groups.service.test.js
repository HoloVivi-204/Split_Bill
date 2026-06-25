/* global beforeEach, describe, expect, test */

require("../../test/env");

jest.mock("../../config/prisma", () => ({
  group: {
    findMany: jest.fn()
  },
  message: {
    groupBy: jest.fn()
  }
}));

const prisma = require("../../config/prisma");
const groupsService = require("./groups.service");

describe("groups service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("listGroupConversations masks deleted latest message and zeroes unread for muted groups", async () => {
    prisma.group.findMany.mockResolvedValue([
      {
        id: "group-muted",
        name: "Muted group",
        description: null,
        created_at: "2026-06-20T10:00:00.000Z",
        members: [{ user_id: "user-1", role: "leader" }],
        chat_participants: [{ is_muted: true, status: "active" }],
        messages: [
          {
            id: "message-muted",
            content: "Should be hidden",
            type: "text",
            is_deleted: true,
            created_at: "2026-06-21T10:00:00.000Z",
            sender: {
              id: "user-2",
              display_name: "Member 2",
              avatar_url: null
            }
          }
        ]
      },
      {
        id: "group-active",
        name: "Active group",
        description: "desc",
        created_at: "2026-06-19T10:00:00.000Z",
        members: [{ user_id: "user-1", role: "member" }],
        chat_participants: [{ is_muted: false, status: "active" }],
        messages: [
          {
            id: "message-active",
            content: "Newest message",
            type: "text",
            is_deleted: false,
            created_at: "2026-06-22T10:00:00.000Z",
            sender: {
              id: "user-3",
              display_name: "Member 3",
              avatar_url: "https://avatar"
            }
          }
        ]
      }
    ]);

    prisma.message.groupBy
      .mockResolvedValueOnce([{ group_id: "group-active", _count: { _all: 4 } }])
      .mockResolvedValueOnce([
        { group_id: "group-active", _count: { _all: 2 } },
        { group_id: "group-muted", _count: { _all: 1 } }
      ]);

    const conversations = await groupsService.listGroupConversations("user-1");

    expect(conversations.map((conversation) => conversation.id)).toEqual([
      "group-active",
      "group-muted"
    ]);
    expect(conversations[0]).toMatchObject({
      id: "group-active",
      unread_count: 4,
      pinned_count: 2,
      is_muted: false,
      latest_message: {
        id: "message-active",
        content: "Newest message",
        sender: {
          user_id: "user-3",
          display_name: "Member 3",
          avatar_url: "https://avatar"
        }
      }
    });
    expect(conversations[1]).toMatchObject({
      id: "group-muted",
      unread_count: 0,
      pinned_count: 1,
      is_muted: true,
      latest_message: {
        id: "message-muted",
        content: "Tin nhắn đã bị xoá",
        is_deleted: true
      }
    });
  });
});
