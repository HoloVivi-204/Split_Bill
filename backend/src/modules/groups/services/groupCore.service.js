const prisma = require("../../../config/prisma");
const { AppError } = require("../../../utils/appError");

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
    orderBy: [{ status: "asc" }, { joined_at: "asc" }]
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
  assignAnimalAvatar,
  createGroup,
  deleteGroup,
  getGroupDetail,
  listGroupMembers,
  listGroups,
  revokeInvitation,
  updateGroup
};
