const prisma = require("../../config/prisma");
const { AppError } = require("../../utils/appError");

const DELETED_MESSAGE_PLACEHOLDER = "Tin nhắn đã bị xoá";
const CHAT_NOT_JOINED_MESSAGE = "Bạn không tham gia nhóm chat này";

function buildMessageSender(sender, groupId) {
  if (!sender) {
    return null;
  }

  return {
    user_id: sender.id,
    display_name: sender.display_name || null,
    avatar_url: sender.avatar_url || null,
    animal_avatar:
      sender.group_members?.find((membership) => membership.group_id === groupId)?.animal_avatar || null
  };
}

function buildPinnedBy(pinner) {
  if (!pinner) {
    return null;
  }

  return {
    user_id: pinner.id,
    display_name: pinner.display_name || null
  };
}

function buildMessageResponse(message) {
  return {
    id: message.id,
    group_id: message.group_id,
    sender: buildMessageSender(message.sender, message.group_id),
    content: message.is_deleted ? DELETED_MESSAGE_PLACEHOLDER : message.content,
    type: message.type,
    is_pinned: message.is_pinned,
    is_deleted: message.is_deleted,
    created_at: message.created_at,
    edited_at: message.edited_at ?? null,
    ...(message.pinner ? { pinned_by: buildPinnedBy(message.pinner) } : {})
  };
}

async function assertActiveGroupMember(groupId, userId) {
  const membership = await prisma.groupMember.findFirst({
    where: {
      group_id: groupId,
      user_id: userId,
      status: "active"
    }
  });

  if (!membership) {
    throw new AppError({
      statusCode: 403,
      code: "NOT_GROUP_MEMBER",
      message: "Bạn không phải thành viên của nhóm này"
    });
  }

  return membership;
}

function getChatParticipantClient() {
  return prisma.chatParticipant || null;
}

async function findChatParticipant(groupId, userId) {
  const chatParticipant = getChatParticipantClient();

  if (!chatParticipant?.findUnique) {
    return null;
  }

  return chatParticipant.findUnique({
    where: {
      group_id_user_id: {
        group_id: groupId,
        user_id: userId
      }
    }
  });
}

async function assertActiveChatParticipant(groupId, userId) {
  const membership = await assertActiveGroupMember(groupId, userId);
  const participant = await findChatParticipant(groupId, userId);

  if (participant?.status === "left") {
    throw new AppError({
      statusCode: 403,
      code: "NOT_CHAT_PARTICIPANT",
      message: CHAT_NOT_JOINED_MESSAGE
    });
  }

  return {
    membership,
    participant: participant || {
      group_id: groupId,
      user_id: userId,
      status: "active",
      is_muted: false
    }
  };
}

async function findMessageInGroup(groupId, messageId) {
  const message = await prisma.message.findUnique({
    where: {
      id: messageId
    },
    include: {
      sender: {
        select: {
          id: true,
          display_name: true,
          avatar_url: true,
          group_members: {
            select: {
              group_id: true,
              animal_avatar: true
            }
          }
        }
      },
      pinner: {
        select: {
          id: true,
          display_name: true
        }
      }
    }
  });

  if (!message || message.group_id !== groupId) {
    throw new AppError({
      statusCode: 404,
      code: "MESSAGE_NOT_FOUND",
      message: "Tin nhắn không tồn tại"
    });
  }

  return message;
}

async function listMessages(groupId, query, actorUserId) {
  if (actorUserId) {
    await assertActiveChatParticipant(groupId, actorUserId);
  }

  const take = (query.limit ?? 20) + 1;
  let cursorMessage = null;

  if (query.cursor) {
    cursorMessage = await prisma.message.findUnique({
      where: {
        id: query.cursor
      },
      select: {
        id: true,
        group_id: true,
        created_at: true
      }
    });

    if (!cursorMessage || cursorMessage.group_id !== groupId) {
      throw new AppError({
        statusCode: 404,
        code: "MESSAGE_NOT_FOUND",
        message: "Tin nhắn không tồn tại"
      });
    }
  }

  const messages = await prisma.message.findMany({
    where: {
      group_id: groupId,
      ...(cursorMessage
        ? {
            created_at: {
              lt: cursorMessage.created_at
            }
          }
        : {})
    },
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    take,
    include: {
      sender: {
        select: {
          id: true,
          display_name: true,
          avatar_url: true,
          group_members: {
            select: {
              group_id: true,
              animal_avatar: true
            }
          }
        }
      },
      pinner: {
        select: {
          id: true,
          display_name: true
        }
      }
    }
  });

  const hasMore = messages.length > (query.limit ?? 20);
  const visibleMessages = hasMore ? messages.slice(0, query.limit ?? 20) : messages;

  return {
    data: visibleMessages.map(buildMessageResponse),
    meta: {
      next_cursor: hasMore ? visibleMessages[visibleMessages.length - 1]?.id ?? null : null,
      has_more: hasMore
    }
  };
}

async function createMessage({ groupId, senderId, content, type = "text" }) {
  await assertActiveChatParticipant(groupId, senderId);

  const message = await prisma.message.create({
    data: {
      group_id: groupId,
      sender_id: type === "system" ? null : senderId,
      content: content.trim(),
      type
    },
    include: {
      sender: {
        select: {
          id: true,
          display_name: true,
          avatar_url: true,
          group_members: {
            select: {
              group_id: true,
              animal_avatar: true
            }
          }
        }
      }
    }
  });

  return buildMessageResponse(message);
}

async function createSystemMessage(groupId, content) {
  const message = await prisma.message.create({
    data: {
      group_id: groupId,
      sender_id: null,
      content,
      type: "system"
    },
    include: {
      sender: {
        select: {
          id: true,
          display_name: true,
          avatar_url: true,
          group_members: {
            select: {
              group_id: true,
              animal_avatar: true
            }
          }
        }
      }
    }
  });

  return buildMessageResponse(message);
}

async function deleteMessage(groupId, messageId, actorUserId, actorRole) {
  await assertActiveChatParticipant(groupId, actorUserId);

  const message = await findMessageInGroup(groupId, messageId);

  if (actorRole !== "leader" && message.sender_id !== actorUserId) {
    throw new AppError({
      statusCode: 403,
      code: "CANNOT_DELETE_MESSAGE",
      message: "Bạn không có quyền xoá tin nhắn này"
    });
  }

  await prisma.message.update({
    where: {
      id: messageId
    },
    data: {
      is_deleted: true
    }
  });

  return {
    message: DELETED_MESSAGE_PLACEHOLDER
  };
}

async function pinMessage(groupId, messageId, actorUserId, pinned) {
  await assertActiveChatParticipant(groupId, actorUserId);

  const message = await findMessageInGroup(groupId, messageId);

  const updatedMessage = await prisma.message.update({
    where: {
      id: message.id
    },
    data: {
      is_pinned: pinned,
      pinned_by: pinned ? actorUserId : null
    },
    include: {
      sender: {
        select: {
          id: true,
          display_name: true,
          avatar_url: true,
          group_members: {
            select: {
              group_id: true,
              animal_avatar: true
            }
          }
        }
      },
      pinner: {
        select: {
          id: true,
          display_name: true
        }
      }
    }
  });

  return {
    message_id: updatedMessage.id,
    is_pinned: updatedMessage.is_pinned,
    pinned_by: buildPinnedBy(updatedMessage.pinner)
  };
}

async function listPinnedMessages(groupId, actorUserId) {
  if (actorUserId) {
    await assertActiveChatParticipant(groupId, actorUserId);
  }

  const messages = await prisma.message.findMany({
    where: {
      group_id: groupId,
      is_pinned: true
    },
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    include: {
      sender: {
        select: {
          id: true,
          display_name: true,
          avatar_url: true,
          group_members: {
            select: {
              group_id: true,
              animal_avatar: true
            }
          }
        }
      },
      pinner: {
        select: {
          id: true,
          display_name: true
        }
      }
    }
  });

  return messages.map((message) => ({
    id: message.id,
    content: message.is_deleted ? DELETED_MESSAGE_PLACEHOLDER : message.content,
    sender: message.sender
      ? {
          display_name: message.sender.display_name || null
        }
      : null,
    pinned_by: message.pinner
      ? {
          display_name: message.pinner.display_name || null
        }
      : null,
    created_at: message.created_at
  }));
}

async function markRead({ userId, groupId, messageId }) {
  const message = await prisma.message.findUnique({
    where: {
      id: messageId
    },
    select: {
      id: true,
      group_id: true,
      created_at: true
    }
  });

  if (!message || message.group_id !== groupId) {
    throw new AppError({
      statusCode: 404,
      code: "MESSAGE_NOT_FOUND",
      message: "Tin nhắn không tồn tại"
    });
  }

  await assertActiveChatParticipant(groupId, userId);

  if (!prisma.messageRead?.upsert) {
    return {
      group_id: groupId,
      last_message_id: messageId,
      read_count: 0
    };
  }

  const messagesToMark = await prisma.message.findMany({
    where: {
      group_id: groupId,
      created_at: {
        lte: message.created_at
      }
    },
    select: {
      id: true
    }
  });

  const readAt = new Date();
  await Promise.all(
    messagesToMark.map((item) =>
      prisma.messageRead.upsert({
        where: {
          message_id_user_id: {
            message_id: item.id,
            user_id: userId
          }
        },
        update: {
          read_at: readAt
        },
        create: {
          message_id: item.id,
          user_id: userId,
          read_at: readAt
        }
      })
    )
  );

  return {
    group_id: groupId,
    last_message_id: messageId,
    read_count: messagesToMark.length
  };
}

function buildChatParticipantResponse(groupId, userId, participant, member) {
  return {
    group_id: groupId,
    user_id: userId,
    ...(member?.user
      ? {
          display_name: member.user.display_name || null,
          avatar_url: member.user.avatar_url || null
        }
      : {}),
    status: participant.status,
    is_muted: Boolean(participant.is_muted)
  };
}

async function updateMyChatSettings({ groupId, userId, isMuted }) {
  await assertActiveChatParticipant(groupId, userId);

  const chatParticipant = getChatParticipantClient();
  if (!chatParticipant?.upsert) {
    return {
      group_id: groupId,
      user_id: userId,
      status: "active",
      is_muted: Boolean(isMuted)
    };
  }

  const participant = await chatParticipant.upsert({
    where: {
      group_id_user_id: {
        group_id: groupId,
        user_id: userId
      }
    },
    update: {
      status: "active",
      is_muted: Boolean(isMuted),
      left_at: null
    },
    create: {
      group_id: groupId,
      user_id: userId,
      status: "active",
      is_muted: Boolean(isMuted)
    }
  });

  return buildChatParticipantResponse(groupId, userId, participant);
}

async function leaveChat({ groupId, userId }) {
  await assertActiveGroupMember(groupId, userId);

  const chatParticipant = getChatParticipantClient();
  if (!chatParticipant?.upsert) {
    return {
      group_id: groupId,
      user_id: userId,
      status: "left",
      is_muted: false,
      message: "Bạn đã rời nhóm chat."
    };
  }

  const leftAt = new Date();
  const participant = await chatParticipant.upsert({
    where: {
      group_id_user_id: {
        group_id: groupId,
        user_id: userId
      }
    },
    update: {
      status: "left",
      is_muted: false,
      left_at: leftAt
    },
    create: {
      group_id: groupId,
      user_id: userId,
      status: "left",
      is_muted: false,
      left_at: leftAt
    }
  });

  return {
    ...buildChatParticipantResponse(groupId, userId, participant),
    message: "Bạn đã rời nhóm chat."
  };
}

async function addChatParticipant({ groupId, actorUserId, targetUserId }) {
  await assertActiveChatParticipant(groupId, actorUserId);

  const targetMember = await prisma.groupMember.findFirst({
    where: {
      group_id: groupId,
      user_id: targetUserId,
      status: "active"
    },
    include: {
      user: {
        select: {
          display_name: true,
          avatar_url: true
        }
      }
    }
  });

  if (!targetMember) {
    throw new AppError({
      statusCode: 404,
      code: "CHAT_MEMBER_NOT_AVAILABLE",
      message: "Chỉ có thể thêm thành viên đang hoạt động của nhóm vào chat"
    });
  }

  const chatParticipant = getChatParticipantClient();
  if (!chatParticipant?.upsert) {
    return buildChatParticipantResponse(
      groupId,
      targetUserId,
      {
        status: "active",
        is_muted: false
      },
      targetMember
    );
  }

  const participant = await chatParticipant.upsert({
    where: {
      group_id_user_id: {
        group_id: groupId,
        user_id: targetUserId
      }
    },
    update: {
      status: "active",
      is_muted: false,
      left_at: null,
      joined_at: new Date()
    },
    create: {
      group_id: groupId,
      user_id: targetUserId,
      status: "active",
      is_muted: false
    }
  });

  return buildChatParticipantResponse(groupId, targetUserId, participant, targetMember);
}

async function listAvailableChatParticipants({ groupId, actorUserId }) {
  await assertActiveChatParticipant(groupId, actorUserId);

  const chatParticipant = getChatParticipantClient();
  if (!chatParticipant?.findMany) {
    return [];
  }

  const [activeMembers, leftParticipants] = await Promise.all([
    prisma.groupMember.findMany({
      where: {
        group_id: groupId,
        status: "active"
      },
      include: {
        user: {
          select: {
            display_name: true,
            avatar_url: true
          }
        }
      }
    }),
    chatParticipant.findMany({
      where: {
        group_id: groupId,
        status: "left"
      },
      select: {
        user_id: true
      }
    })
  ]);

  const leftUserIds = new Set(leftParticipants.map((participant) => participant.user_id));

  return activeMembers
    .filter((member) => leftUserIds.has(member.user_id))
    .map((member) => ({
      user_id: member.user_id,
      display_name: member.user?.display_name || null,
      avatar_url: member.user?.avatar_url || null,
      role: member.role
    }));
}

module.exports = {
  assertActiveGroupMember,
  assertActiveChatParticipant,
  addChatParticipant,
  buildMessageResponse,
  createMessage,
  createSystemMessage,
  deleteMessage,
  leaveChat,
  listAvailableChatParticipants,
  listMessages,
  listPinnedMessages,
  markRead,
  pinMessage,
  updateMyChatSettings
};
