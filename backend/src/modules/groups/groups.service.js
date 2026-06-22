const prisma = require("../../config/prisma");
const { AppError } = require("../../utils/appError");
const { createNotification, emitNotifications } = require("../../utils/notification");

const ANIMALS = [
  "cat",
  "dog",
  "fox",
  "rabbit",
  "bear",
  "tiger",
  "lion",
  "elephant",
  "giraffe",
  "panda",
  "koala",
  "penguin",
  "owl",
  "eagle",
  "dolphin",
  "whale",
  "deer",
  "wolf",
  "monkey",
  "horse"
];

const DELETED_MESSAGE_PLACEHOLDER = "Tin nhắn đã bị xoá";

async function createGroup(userId, input) {
  const group = await prisma.$transaction(async (tx) => {
    const createdGroup = await tx.group.create({
      data: {
        name: input.name,
        description: input.description || null,
        currency: input.currency || "VND",
        created_by: userId
      }
    });

    await tx.groupMember.create({
      data: {
        group_id: createdGroup.id,
        user_id: userId,
        role: "leader",
        status: "active",
        animal_avatar: "lion"
      }
    });

    return createdGroup;
  });

  return {
    id: group.id,
    name: group.name,
    description: group.description,
    currency: group.currency,
    created_by: group.created_by,
    created_at: group.created_at,
    my_role: "leader",
    member_count: 1
  };
}

async function listGroups(userId) {
  const groups = await prisma.group.findMany({
    where: {
      status: "active",
      members: {
        some: {
          user_id: userId,
          status: "active"
        }
      },
      NOT: {
        chat_participants: {
          some: {
            user_id: userId,
            status: "left"
          }
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
      }
    },
    orderBy: {
      created_at: "desc"
    }
  });

  return groups.map((group) => {
    const myMembership = group.members.find((member) => member.user_id === userId);

    return {
      id: group.id,
      name: group.name,
      description: group.description,
      currency: group.currency,
      member_count: group.members.length,
      my_role: myMembership?.role || "member",
      my_balance: 0,
      created_at: group.created_at
    };
  });
}

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

async function getGroupDetail(groupId, membership) {
  const [group, activeCampaignsCount, activeQrConfig] = await Promise.all([
    prisma.group.findUnique({
      where: {
        id: groupId
      },
      include: {
        members: {
          where: {
            status: "active"
          },
          select: {
            id: true
          }
        }
      }
    }),
    prisma.fundCampaign.count({
      where: {
        group_id: groupId,
        status: "active"
      }
    }),
    prisma.fundQrCode.findFirst({
      where: {
        group_id: groupId,
        is_active: true
      },
      select: {
        id: true
      }
    })
  ]);

  if (!group || group.status !== "active") {
    throw new AppError({
      statusCode: 404,
      code: "GROUP_NOT_FOUND",
      message: "Nhóm không tồn tại"
    });
  }

  return {
    id: group.id,
    name: group.name,
    description: group.description,
    currency: group.currency,
    created_by: group.created_by,
    created_at: group.created_at,
    my_role: membership.role,
    member_count: group.members.length,
    active_campaigns_count: activeCampaignsCount,
    has_qr: Boolean(activeQrConfig)
  };
}

async function listGroupMembers(groupId) {
  const members = await prisma.groupMember.findMany({
    where: {
      group_id: groupId
    },
    select: {
      user_id: true,
      role: true,
      status: true,
      animal_avatar: true,
      joined_at: true,
      user: {
        select: {
          display_name: true,
          avatar_url: true
        }
      }
    },
    orderBy: [
      { status: "asc" },
      { joined_at: "asc" }
    ]
  });

  return members.map((member) => ({
    user_id: member.user_id,
    display_name: member.user?.display_name || null,
    avatar_url: member.user?.avatar_url || null,
    animal_avatar: member.animal_avatar || null,
    role: member.role,
    status: member.status,
    joined_at: member.joined_at
  }));
}

async function updateGroup(groupId, input) {
  const group = await prisma.group.update({
    where: {
      id: groupId
    },
    data: {
      ...(input.name ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {})
    }
  });

  return {
    id: group.id,
    name: group.name,
    description: group.description
  };
}

async function assignAnimalAvatar(groupId) {
  const usedAvatars = await prisma.groupMember.findMany({
    where: {
      group_id: groupId,
      status: "active"
    },
    select: {
      animal_avatar: true
    }
  });

  const used = new Set(usedAvatars.map((item) => item.animal_avatar).filter(Boolean));
  const available = ANIMALS.filter((animal) => !used.has(animal));

  return available[0] || ANIMALS[0];
}

async function revokeInvitation(groupId, invitationId) {
  const invitation = await prisma.invitation.findUnique({
    where: {
      id: invitationId
    }
  });

  if (!invitation || invitation.group_id !== groupId) {
    throw new AppError({
      statusCode: 404,
      code: "INVITATION_NOT_FOUND",
      message: "Liên kết mời không tồn tại"
    });
  }

  await prisma.invitation.update({
    where: {
      id: invitationId
    },
    data: {
      status: "revoked"
    }
  });
}

async function requestLeaveGroup(groupId, actorMembership, input, io) {
  if (actorMembership.role === "leader") {
    if (!input.transfer_leader_to) {
      throw new AppError({
        statusCode: 400,
        code: "LEADER_MUST_TRANSFER",
        message: "Trưởng nhóm phải chỉ định người nhận quyền trước"
      });
    }

    const activeMembers = await prisma.groupMember.findMany({
      where: {
        group_id: groupId,
        status: "active"
      }
    });

    const otherMembers = activeMembers.filter((member) => member.user_id !== actorMembership.user_id);
    if (input.transfer_leader_to) {
      const replacement = otherMembers.find((member) => member.user_id === input.transfer_leader_to);

      if (!replacement) {
        throw new AppError({
          statusCode: 400,
          code: "TRANSFER_TARGET_NOT_MEMBER",
          message: "Người được chuyển quyền không phải thành viên đang hoạt động"
        });
      }

      let notifications = [];

      await prisma.$transaction(async (tx) => {
        await tx.groupMember.update({
          where: {
            group_id_user_id: {
              group_id: groupId,
              user_id: replacement.user_id
            }
          },
          data: {
            role: "leader"
          }
        });

        await tx.groupMember.update({
          where: {
            group_id_user_id: {
              group_id: groupId,
              user_id: actorMembership.user_id
            }
          },
          data: {
            status: "left",
            left_at: new Date(),
            role: "member"
          }
        });

        notifications = (
          await Promise.all(
            otherMembers
              .filter((member) => member.user_id !== replacement.user_id)
              .map((member) =>
                createNotification(tx, {
                  user_id: member.user_id,
                  group_id: groupId,
                  type: "member_left",
                  title: "Thành viên rời nhóm",
                  body: "Một thành viên vừa rời nhóm"
                })
              )
          )
        ).filter(Boolean);
      });

      emitNotifications(io, notifications);

      return {
        message: "Rời nhóm thành công sau khi chuyển quyền trưởng nhóm."
      };
    }
  }

  let notifications = [];

  const leaveRequest = await prisma.$transaction(async (tx) => {
    await tx.groupMember.update({
      where: {
        group_id_user_id: {
          group_id: groupId,
          user_id: actorMembership.user_id
        }
      },
      data: {
        status: "active"
      }
    });

    const createdLeaveRequest = await tx.leaveRequest.create({
      data: {
        group_id: groupId,
        user_id: actorMembership.user_id,
        status: "pending",
        transfer_leader_to: input.transfer_leader_to || null
      }
    });

    const leaders = await tx.groupMember.findMany({
      where: {
        group_id: groupId,
        role: "leader",
        status: "active"
      },
      select: {
        user_id: true
      }
    });

    notifications = (
      await Promise.all(
        leaders.map((leader) =>
          createNotification(tx, {
            user_id: leader.user_id,
            group_id: groupId,
            type: "leave_request",
            title: "Yêu cầu rời nhóm",
            body: "Có thành viên vừa gửi yêu cầu rời nhóm"
          })
        )
      )
    ).filter(Boolean);

    return createdLeaveRequest;
  });

  emitNotifications(io, notifications);

  return {
    message: "Yêu cầu rời nhóm đã được gửi. Chờ trưởng nhóm xác nhận.",
    leave_request_id: leaveRequest.id
  };
}

async function listLeaveRequests(groupId) {
  const requests = await prisma.leaveRequest.findMany({
    where: {
      group_id: groupId,
      status: "pending"
    },
    include: {
      user: true
    },
    orderBy: {
      created_at: "desc"
    }
  });

  let membershipMap = new Map();
  const needsMembershipLookup = requests.some((item) => !item.membership);

  if (needsMembershipLookup && requests.length > 0) {
    const memberships = await prisma.groupMember.findMany({
      where: {
        group_id: groupId
      }
    });
    membershipMap = new Map(memberships.map((member) => [member.user_id, member]));
  }

  return requests.map((request) => {
    const membership = request.membership || membershipMap.get(request.user_id);

    return {
      id: request.id,
      user: {
        user_id: request.user?.id || request.user_id,
        display_name: request.user?.display_name || null,
        animal_avatar: membership?.animal_avatar || null
      },
      status: request.status,
      created_at: request.created_at
    };
  });
}

async function processLeaveRequest(groupId, requestId, input, io) {
  const leaveRequest = await prisma.leaveRequest.findUnique({
    where: {
      id: requestId
    }
  });

  if (!leaveRequest || leaveRequest.group_id !== groupId) {
    throw new AppError({
      statusCode: 404,
      code: "LEAVE_REQUEST_NOT_FOUND",
      message: "Không tìm thấy yêu cầu rời nhóm"
    });
  }

  if (leaveRequest.status !== "pending") {
    throw new AppError({
      statusCode: 409,
      code: "LEAVE_REQUEST_ALREADY_PROCESSED",
      message: "Yêu cầu rời nhóm đã được xử lý trước đó"
    });
  }

  const nextStatus = input.action === "approve" ? "approved" : "rejected";

  let notifications = [];

  await prisma.$transaction(async (tx) => {
    await tx.leaveRequest.update({
      where: {
        id: requestId
      },
      data: {
        status: nextStatus,
        reason: input.reason || null,
        processed_at: new Date()
      }
    });

    await tx.groupMember.update({
      where: {
        group_id_user_id: {
          group_id: groupId,
          user_id: leaveRequest.user_id
        }
      },
      data:
        input.action === "approve"
          ? {
              status: "left",
              left_at: new Date()
            }
          : {
              status: "active"
            }
    });

    notifications.push(
      await createNotification(tx, {
        user_id: leaveRequest.user_id,
        group_id: groupId,
        type: input.action === "approve" ? "leave_approved" : "leave_rejected",
        title: input.action === "approve" ? "Yêu cầu rời nhóm được chấp nhận" : "Yêu cầu rời nhóm bị từ chối",
        body:
          input.action === "approve"
            ? "Bạn đã được chấp nhận rời nhóm"
            : "Yêu cầu rời nhóm của bạn đã bị từ chối"
      })
    );

    if (input.action === "approve") {
      const activeMembers = await tx.groupMember.findMany({
        where: {
          group_id: groupId,
          status: "active"
        },
        select: {
          user_id: true
        }
      });

      const memberLeftNotifications = await Promise.all(
        activeMembers.map((member) =>
          createNotification(tx, {
            user_id: member.user_id,
            group_id: groupId,
            type: "member_left",
            title: "Thành viên rời nhóm",
            body: "Một thành viên vừa rời nhóm"
          })
        )
      );

      notifications.push(...memberLeftNotifications);
    }
  });

  emitNotifications(io, notifications.filter(Boolean));

  return {
    message:
      input.action === "approve"
        ? "Đã chấp nhận yêu cầu rời nhóm"
        : "Đã từ chối yêu cầu rời nhóm"
  };
}

async function transferLeader(groupId, actorUserId, newLeaderId) {
  if (actorUserId === newLeaderId) {
    throw new AppError({
      statusCode: 400,
      code: "CANNOT_TRANSFER_TO_SELF",
      message: "Không thể chuyển quyền trưởng nhóm cho chính mình"
    });
  }

  const newLeader = await prisma.groupMember.findUnique({
    where: {
      group_id_user_id: {
        group_id: groupId,
        user_id: newLeaderId
      }
    }
  });

  if (!newLeader || newLeader.status !== "active") {
    throw new AppError({
      statusCode: 400,
      code: "TRANSFER_TARGET_NOT_MEMBER",
      message: "Người nhận quyền không phải thành viên đang hoạt động"
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.groupMember.update({
      where: {
        group_id_user_id: {
          group_id: groupId,
          user_id: actorUserId
        }
      },
      data: {
        role: "member"
      }
    });

    await tx.groupMember.update({
      where: {
        group_id_user_id: {
          group_id: groupId,
          user_id: newLeaderId
        }
      },
      data: {
        role: "leader"
      }
    });
  });

  return {
    previous_leader_id: actorUserId,
    new_leader_id: newLeaderId,
    previous_leader_role: "member",
    message: "Chuyển quyền trưởng nhóm thành công"
  };
}

async function updateMemberRole(groupId, actorUserId, targetUserId, nextRole) {
  if (actorUserId === targetUserId) {
    throw new AppError({
      statusCode: 400,
      code: "CANNOT_CHANGE_OWN_ROLE",
      message: "Không thể tự đổi vai trò của mình"
    });
  }

  const targetMember = await prisma.groupMember.findUnique({
    where: {
      group_id_user_id: {
        group_id: groupId,
        user_id: targetUserId
      }
    }
  });

  if (!targetMember || targetMember.status !== "active") {
    throw new AppError({
      statusCode: 404,
      code: "MEMBER_NOT_FOUND",
      message: "Thành viên không tồn tại trong nhóm"
    });
  }

  const updatedMember = await prisma.$transaction(async (tx) => {
    if (nextRole === "secretary") {
      await tx.groupMember.updateMany({
        where: {
          group_id: groupId,
          role: "secretary",
          status: "active"
        },
        data: {
          role: "member"
        }
      });
    }

    return tx.groupMember.update({
      where: {
        group_id_user_id: {
          group_id: groupId,
          user_id: targetUserId
        }
      },
      data: {
        role: nextRole
      }
    });
  });

  return {
    user_id: updatedMember.user_id,
    role: updatedMember.role,
    message: "Đổi vai trò thành công"
  };
}

async function kickMember(groupId, actorUserId, targetUserId) {
  if (actorUserId === targetUserId) {
    throw new AppError({
      statusCode: 400,
      code: "CANNOT_KICK_SELF",
      message: "Không thể tự xóa chính mình khỏi nhóm"
    });
  }

  const targetMember = await prisma.groupMember.findUnique({
    where: {
      group_id_user_id: {
        group_id: groupId,
        user_id: targetUserId
      }
    }
  });

  if (!targetMember || targetMember.status !== "active") {
    throw new AppError({
      statusCode: 404,
      code: "MEMBER_NOT_FOUND",
      message: "Thành viên không tồn tại"
    });
  }

  await prisma.groupMember.update({
    where: {
      group_id_user_id: {
        group_id: groupId,
        user_id: targetUserId
      }
    },
    data: {
      status: "kicked",
      left_at: new Date()
    }
  });

  return {
    message: "Đã xóa thành viên khỏi nhóm",
    affected_contributions: 0
  };
}

async function deleteGroup(groupId, actorMembership, input) {
  const group = await prisma.group.findUnique({
    where: {
      id: groupId
    }
  });

  if (!group || group.status !== "active") {
    throw new AppError({
      statusCode: 404,
      code: "GROUP_NOT_FOUND",
      message: "Nhóm không tồn tại"
    });
  }

  const activeSecretary = await prisma.groupMember.findFirst({
    where: {
      group_id: groupId,
      role: "secretary",
      status: "active"
    }
  });

  if (input.step === "leader" && activeSecretary && actorMembership.role === "leader") {
    return {
      message: "Đã gửi yêu cầu xóa nhóm đến thư ký. Chờ thư ký xác nhận.",
      pending_confirmation: true
    };
  }

  if (input.step === "secretary" && actorMembership.role !== "secretary") {
    throw new AppError({
      statusCode: 403,
      code: "INSUFFICIENT_ROLE",
      message: "Vai trò của bạn không đủ quyền"
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.group.update({
      where: {
        id: groupId
      },
      data: {
        status: "deleted",
        deleted_at: new Date()
      }
    });

    await tx.invitation.updateMany({
      where: {
        group_id: groupId,
        status: "active"
      },
      data: {
        status: "revoked"
      }
    });
  });

  return {
    message: "Nhóm đã được xóa thành công"
  };
}

module.exports = {
  createGroup,
  listGroups,
  listGroupConversations,
  getGroupDetail,
  listGroupMembers,
  updateGroup,
  assignAnimalAvatar,
  revokeInvitation,
  requestLeaveGroup,
  listLeaveRequests,
  processLeaveRequest,
  transferLeader,
  updateMemberRole,
  kickMember,
  deleteGroup
};
