const crypto = require("crypto");

const env = require("../../config/env");
const prisma = require("../../config/prisma");
const { AppError } = require("../../utils/appError");
const { createNotification, emitNotifications } = require("../../utils/notification");
const { createSystemMessage } = require("../../utils/systemMessage");
const { assignAnimalAvatar } = require("../groups/groups.service");

function buildInviteUrl(token) {
  const baseUrl = env.FRONTEND_URL.split(",")[0].trim().replace(/\/$/, "");
  return `${baseUrl}/invite/${token}`;
}

function generateInvitationToken() {
  return crypto.randomBytes(6).toString("base64url");
}

function validateInvitationAvailability(invitation) {
  if (!invitation || !invitation.group || invitation.group.status !== "active") {
    throw new AppError({
      statusCode: 404,
      code: "INVITATION_NOT_FOUND",
      message: "Liên kết mời không tồn tại"
    });
  }

  if (invitation.status && invitation.status !== "active") {
    throw new AppError({
      statusCode: 404,
      code: "INVITATION_NOT_FOUND",
      message: "Liên kết mời không tồn tại"
    });
  }

  if (invitation.expires_at && invitation.expires_at <= new Date()) {
    throw new AppError({
      statusCode: 409,
      code: "INVITATION_EXPIRED",
      message: "Liên kết mời đã hết hạn"
    });
  }

  if (invitation.max_uses !== null && invitation.max_uses !== undefined && invitation.use_count >= invitation.max_uses) {
    throw new AppError({
      statusCode: 409,
      code: "INVITATION_MAX_USES_REACHED",
      message: "Liên kết mời đã đạt giới hạn sử dụng"
    });
  }
}

function buildInvitationPreview(invitation) {
  return {
    token: invitation.token,
    group: {
      id: invitation.group.id,
      name: invitation.group.name,
      description: invitation.group.description ?? ""
    },
    expires_at: invitation.expires_at,
    max_uses: invitation.max_uses,
    use_count: invitation.use_count,
    is_joinable: true
  };
}

async function createInvitation(groupId, userId, input) {
  const invitationData = {
    token: generateInvitationToken(),
    max_uses: input.max_uses ?? null,
    group: {
      connect: {
        id: groupId
      }
    },
    creator: {
      connect: {
        id: userId
      }
    }
  };

  if (input.expires_at) {
    invitationData.expires_at = new Date(input.expires_at);
  }

  const invitation = await prisma.invitation.create({
    data: invitationData
  });

  return {
    id: invitation.id,
    token: invitation.token,
    invite_url: buildInviteUrl(invitation.token),
    expires_at: invitation.expires_at,
    max_uses: invitation.max_uses,
    use_count: invitation.use_count,
    created_at: invitation.created_at
  };
}

async function listInvitations(groupId) {
  const invitations = await prisma.invitation.findMany({
    where: {
      group_id: groupId
    },
    orderBy: {
      created_at: "desc"
    }
  });

  return invitations.map((invitation) => ({
    id: invitation.id,
    token: invitation.token,
    invite_url: buildInviteUrl(invitation.token),
    expires_at: invitation.expires_at,
    max_uses: invitation.max_uses,
    use_count: invitation.use_count,
    created_at: invitation.created_at
  }));
}

async function getInvitationPreview(token) {
  const invitation = await prisma.invitation.findUnique({
    where: {
      token
    },
    include: {
      group: {
        select: {
          id: true,
          name: true,
          description: true,
          status: true
        }
      }
    }
  });

  validateInvitationAvailability(invitation);

  return buildInvitationPreview(invitation);
}

async function joinInvitation(userId, token, io) {
  const invitation = await prisma.invitation.findUnique({
    where: {
      token
    },
    include: {
      group: true
    }
  });

  validateInvitationAvailability(invitation);

  const existingMembership = await prisma.groupMember.findUnique({
    where: {
      group_id_user_id: {
        group_id: invitation.group_id,
        user_id: userId
      }
    }
  });

  if (existingMembership?.status === "active") {
    return {
      group: {
        id: invitation.group.id,
        name: invitation.group.name
      },
      my_role: existingMembership.role,
      animal_avatar: existingMembership.animal_avatar,
      message: "Bạn đã là thành viên của nhóm này."
    };
  }

  const animalAvatar = await assignAnimalAvatar(invitation.group_id);
  const joiningUser = await prisma.user.findUnique({
    where: {
      id: userId
    },
    select: {
      display_name: true
    }
  });

  let notifications = [];

  await prisma.$transaction(async (tx) => {
    await tx.groupMember.create({
      data: {
        group_id: invitation.group_id,
        user_id: userId,
        role: "member",
        status: "active",
        animal_avatar: animalAvatar
      }
    });

    await tx.invitation.update({
      where: {
        id: invitation.id
      },
      data: {
        use_count: invitation.use_count + 1
      }
    });

    await createSystemMessage(
      tx,
      invitation.group_id,
      `${joiningUser?.display_name || "Thành viên mới"} vừa tham gia nhóm`
    );

    const activeMembers = await tx.groupMember.findMany({
      where: {
        group_id: invitation.group_id,
        status: "active"
      },
      select: {
        user_id: true
      }
    });

    notifications = (
      await Promise.all(
        activeMembers
          .filter((member) => member.user_id !== userId)
          .map((member) =>
            createNotification(tx, {
              user_id: member.user_id,
              group_id: invitation.group_id,
              type: "member_joined",
              title: "Thành viên mới",
              body: `${joiningUser?.display_name || "Thành viên mới"} vừa tham gia nhóm`
            })
          )
      )
    ).filter(Boolean);
  });

  emitNotifications(io, notifications);

  return {
    group: {
      id: invitation.group.id,
      name: invitation.group.name
    },
    my_role: "member",
    animal_avatar: animalAvatar,
    message: "Tham gia nhóm thành công!"
  };
}

module.exports = {
  createInvitation,
  getInvitationPreview,
  listInvitations,
  joinInvitation
};
