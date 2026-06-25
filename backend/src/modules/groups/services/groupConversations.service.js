const prisma = require("../../../config/prisma");

const DELETED_MESSAGE_PLACEHOLDER = "Tin nhắn đã bị xoá";

function countMap(rows) {
  return new Map(rows.map((row) => [row.group_id, row._count?._all ?? 0]));
}

function buildConversationSender(sender) {
  if (!sender) {
    return null;
  }

  return {
    user_id: sender.id,
    display_name: sender.display_name || null,
    avatar_url: sender.avatar_url || null
  };
}

function buildLatestMessage(message) {
  if (!message) {
    return null;
  }

  return {
    id: message.id,
    content: message.is_deleted ? DELETED_MESSAGE_PLACEHOLDER : message.content,
    type: message.type,
    is_deleted: message.is_deleted,
    created_at: message.created_at,
    sender: buildConversationSender(message.sender)
  };
}

async function listGroupConversations(userId) {
  const groups = await prisma.group.findMany({
    where: {
      status: "active",
      members: {
        some: {
          user_id: userId,
          status: "active"
        }
      }
    },
    include: {
      members: {
        where: {
          status: "active"
        },
        select: {
          user_id: true,
          role: true
        }
      },
      chat_participants: {
        where: {
          user_id: userId
        },
        select: {
          status: true,
          is_muted: true
        }
      },
      messages: {
        orderBy: [{ created_at: "desc" }, { id: "desc" }],
        take: 1,
        select: {
          id: true,
          content: true,
          type: true,
          is_deleted: true,
          created_at: true,
          sender: {
            select: {
              id: true,
              display_name: true,
              avatar_url: true
            }
          }
        }
      }
    },
    orderBy: {
      created_at: "desc"
    }
  });

  const groupIds = groups.map((group) => group.id);
  if (groupIds.length === 0) {
    return [];
  }

  const isGroupMuted = (group) => Boolean(group.chat_participants?.[0]?.is_muted);
  const unreadGroupIds = groups.filter((group) => !isGroupMuted(group)).map((group) => group.id);

  const [unreadCounts, pinnedCounts] = await Promise.all([
    unreadGroupIds.length > 0
      ? prisma.message.groupBy({
          by: ["group_id"],
          where: {
            group_id: {
              in: unreadGroupIds
            },
            is_deleted: false,
            OR: [
              {
                sender_id: null
              },
              {
                sender_id: {
                  not: userId
                }
              }
            ],
            reads: {
              none: {
                user_id: userId
              }
            }
          },
          _count: {
            _all: true
          }
        })
      : [],
    prisma.message.groupBy({
      by: ["group_id"],
      where: {
        group_id: {
          in: groupIds
        },
        is_pinned: true
      },
      _count: {
        _all: true
      }
    })
  ]);

  const unreadByGroup = countMap(unreadCounts);
  const pinnedByGroup = countMap(pinnedCounts);

  return groups
    .map((group) => {
      const myMembership = group.members.find((member) => member.user_id === userId);
      const latestMessage = group.messages[0] || null;
      const isMuted = isGroupMuted(group);

      return {
        id: group.id,
        name: group.name,
        description: group.description,
        member_count: group.members.length,
        my_role: myMembership?.role || "member",
        is_muted: isMuted,
        created_at: group.created_at,
        latest_message: buildLatestMessage(latestMessage),
        unread_count: isMuted ? 0 : unreadByGroup.get(group.id) || 0,
        pinned_count: pinnedByGroup.get(group.id) || 0
      };
    })
    .sort((left, right) => {
      const leftTime = new Date(left.latest_message?.created_at || left.created_at).getTime();
      const rightTime = new Date(right.latest_message?.created_at || right.created_at).getTime();
      return rightTime - leftTime;
    });
}

module.exports = {
  listGroupConversations
};
