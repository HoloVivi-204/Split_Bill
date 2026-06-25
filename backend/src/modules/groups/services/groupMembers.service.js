const prisma = require("../../../config/prisma");
const { AppError } = require("../../../utils/appError");
const { createNotification, emitNotifications } = require("../../../utils/notification");

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
        title:
          input.action === "approve"
            ? "Yêu cầu rời nhóm được chấp nhận"
            : "Yêu cầu rời nhóm bị từ chối",
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

module.exports = {
  kickMember,
  listLeaveRequests,
  processLeaveRequest,
  requestLeaveGroup,
  transferLeader,
  updateMemberRole
};
