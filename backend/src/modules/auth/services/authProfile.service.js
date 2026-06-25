const bcrypt = require("bcrypt");
const crypto = require("crypto");

const prisma = require("../../../config/prisma");
const { AppError } = require("../../../utils/appError");
const { deleteImage, uploadImage } = require("../../../utils/cloudinary");
const { calculateBalanceMap, roundMoney } = require("../../../utils/debtSettlement");
const { hashPassword } = require("./authRecovery.service");

const DELETED_ACCOUNT_DISPLAY_NAME = "Tài khoản đã xoá";

function buildDeletedAccountEmail(userId) {
  return `deleted-${userId}@deleted.splitbill.local`;
}

async function loadAccountDeletionSnapshot(userId, client = prisma) {
  const user = await client.user.findUnique({
    where: {
      id: userId
    },
    include: {
      group_members: {
        where: {
          status: "active"
        }
      }
    }
  });

  if (!user) {
    throw new AppError({
      statusCode: 404,
      code: "USER_NOT_FOUND",
      message: "Không tìm thấy người dùng"
    });
  }

  if (user.group_members.some((membership) => membership.role === "leader")) {
    throw new AppError({
      statusCode: 409,
      code: "ACCOUNT_LEADER_IN_ACTIVE_GROUP",
      message: "Vui lòng chuyển quyền trưởng nhóm trước khi xoá tài khoản"
    });
  }

  const activeGroupIds = user.group_members.map((membership) => membership.group_id);

  if (activeGroupIds.length === 0) {
    return {
      user,
      activeGroupIds
    };
  }

  const [expenses, settlements, unpaidFundContributions] = await Promise.all([
    client.expense.findMany({
      where: {
        group_id: {
          in: activeGroupIds
        }
      },
      include: {
        splits: true
      }
    }),
    client.settlement.findMany({
      where: {
        group_id: {
          in: activeGroupIds
        }
      }
    }),
    client.fundContribution.count({
      where: {
        user_id: userId,
        status: {
          in: ["pending", "late"]
        },
        campaign: {
          group_id: {
            in: activeGroupIds
          },
          status: "active"
        }
      }
    })
  ]);

  const expensesByGroup = new Map();
  const settlementsByGroup = new Map();

  for (const groupId of activeGroupIds) {
    expensesByGroup.set(groupId, []);
    settlementsByGroup.set(groupId, []);
  }

  for (const expense of expenses) {
    expensesByGroup.get(expense.group_id)?.push({
      ...expense,
      amount: Number(expense.amount),
      splits: expense.splits.map((split) => ({
        ...split,
        amount: Number(split.amount)
      }))
    });
  }

  for (const settlement of settlements) {
    settlementsByGroup.get(settlement.group_id)?.push({
      ...settlement,
      amount: Number(settlement.amount)
    });
  }

  const hasUnsettledBalance = activeGroupIds.some((groupId) => {
    const balanceMap = calculateBalanceMap(
      expensesByGroup.get(groupId) || [],
      settlementsByGroup.get(groupId) || []
    );

    return Math.abs(roundMoney(balanceMap.get(userId) || 0)) > 0.01;
  });

  if (hasUnsettledBalance || unpaidFundContributions > 0) {
    throw new AppError({
      statusCode: 409,
      code: "ACCOUNT_HAS_DEBT",
      message: "Không thể xoá tài khoản khi còn nợ hoặc khoản quỹ chưa đóng"
    });
  }

  return {
    user,
    activeGroupIds
  };
}

async function getMe(userId) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId
    },
    include: {
      group_members: {
        where: {
          status: "active"
        }
      }
    }
  });

  if (!user) {
    throw new AppError({
      statusCode: 404,
      code: "USER_NOT_FOUND",
      message: "Không tìm thấy người dùng"
    });
  }

  const activeGroupIds = user.group_members.map((membership) => membership.group_id);
  let totalPersonalSpending = 0;
  let totalOwed = 0;
  let totalOwe = 0;

  if (activeGroupIds.length > 0) {
    const [expenses, settlements] = await Promise.all([
      prisma.expense.findMany({
        where: {
          group_id: {
            in: activeGroupIds
          }
        },
        include: {
          splits: true
        }
      }),
      prisma.settlement.findMany({
        where: {
          group_id: {
            in: activeGroupIds
          }
        }
      })
    ]);

    const expensesByGroup = new Map();
    const settlementsByGroup = new Map();

    for (const groupId of activeGroupIds) {
      expensesByGroup.set(groupId, []);
      settlementsByGroup.set(groupId, []);
    }

    for (const expense of expenses) {
      totalPersonalSpending += expense.paid_by === userId ? Number(expense.amount) : 0;
      expensesByGroup.get(expense.group_id)?.push({
        ...expense,
        amount: Number(expense.amount),
        splits: expense.splits.map((split) => ({
          ...split,
          amount: Number(split.amount)
        }))
      });
    }

    for (const settlement of settlements) {
      settlementsByGroup.get(settlement.group_id)?.push({
        ...settlement,
        amount: Number(settlement.amount)
      });
    }

    for (const groupId of activeGroupIds) {
      const balanceMap = calculateBalanceMap(
        expensesByGroup.get(groupId) || [],
        settlementsByGroup.get(groupId) || []
      );
      const balance = roundMoney(balanceMap.get(userId) || 0);

      if (balance > 0.01) {
        totalOwed = roundMoney(totalOwed + balance);
      } else if (balance < -0.01) {
        totalOwe = roundMoney(totalOwe + Math.abs(balance));
      }
    }
  }

  return {
    id: user.id,
    email: user.email,
    display_name: user.display_name,
    avatar_url: user.avatar_url || null,
    created_at: user.created_at,
    stats: {
      groups_count: user.group_members?.length || 0,
      total_personal_spending: roundMoney(totalPersonalSpending),
      total_owed: totalOwed,
      total_owe: totalOwe
    }
  };
}

async function updateProfile(userId, input) {
  const user = await prisma.user.update({
    where: {
      id: userId
    },
    data: {
      display_name: input.display_name
    }
  });

  return {
    id: user.id,
    display_name: user.display_name
  };
}

async function updateDisplayName(userId, displayName) {
  const user = await prisma.user.update({
    where: {
      id: userId
    },
    data: {
      display_name: displayName
    }
  });

  return {
    id: user.id,
    email: user.email,
    display_name: user.display_name
  };
}

async function changePassword(userId, input) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId
    }
  });

  if (!user) {
    throw new AppError({
      statusCode: 404,
      code: "USER_NOT_FOUND",
      message: "Không tìm thấy người dùng"
    });
  }

  const isPasswordValid = await bcrypt.compare(input.current_password, user.password_hash);

  if (!isPasswordValid) {
    throw new AppError({
      statusCode: 401,
      code: "CURRENT_PASSWORD_INCORRECT",
      message: "Mật khẩu hiện tại không chính xác"
    });
  }

  const nextPasswordHash = await hashPassword(input.new_password);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: {
        id: userId
      },
      data: {
        password_hash: nextPasswordHash
      }
    });

    await tx.refreshToken.updateMany({
      where: {
        user_id: userId,
        revoked_at: null
      },
      data: {
        revoked_at: new Date()
      }
    });
  });

  return {
    message: "Đổi mật khẩu thành công"
  };
}

async function deleteAccount(userId) {
  const { user } = await loadAccountDeletionSnapshot(userId);

  if (user.avatar_url) {
    await deleteImage(`splitbill/avatars/${userId}`);
  }

  const deletedPasswordHash = await hashPassword(crypto.randomBytes(32).toString("hex"));

  await prisma.$transaction(async (tx) => {
    await loadAccountDeletionSnapshot(userId, tx);

    await tx.groupMember.updateMany({
      where: {
        user_id: userId,
        status: "active"
      },
      data: {
        status: "left",
        left_at: new Date(),
        role: "member"
      }
    });

    await tx.recoveryCode.deleteMany({
      where: {
        user_id: userId
      }
    });

    await tx.refreshToken.updateMany({
      where: {
        user_id: userId,
        revoked_at: null
      },
      data: {
        revoked_at: new Date()
      }
    });

    await tx.user.update({
      where: {
        id: userId
      },
      data: {
        email: buildDeletedAccountEmail(userId),
        password_hash: deletedPasswordHash,
        display_name: DELETED_ACCOUNT_DISPLAY_NAME,
        avatar_url: null
      }
    });
  });

  return {
    message: "Đã xoá tài khoản thành công"
  };
}

async function deleteAvatar(userId) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId
    }
  });

  if (!user) {
    throw new AppError({
      statusCode: 404,
      code: "USER_NOT_FOUND",
      message: "Không tìm thấy người dùng"
    });
  }

  if (!user.avatar_url) {
    throw new AppError({
      statusCode: 400,
      code: "NO_AVATAR_TO_DELETE",
      message: "Người dùng chưa có avatar để xóa"
    });
  }

  await deleteImage(`splitbill/avatars/${userId}`);

  const updatedUser = await prisma.user.update({
    where: {
      id: userId
    },
    data: {
      avatar_url: null
    }
  });

  return {
    message: "Đã xóa avatar thành công",
    avatar_url: updatedUser.avatar_url
  };
}

async function uploadAvatar(userId, file) {
  if (!file?.buffer) {
    throw new AppError({
      statusCode: 400,
      code: "INVALID_FILE_TYPE",
      message: "File không phải là ảnh hợp lệ"
    });
  }

  try {
    const result = await uploadImage(file.buffer, "splitbill/avatars", userId);
    const updatedUser = await prisma.user.update({
      where: {
        id: userId
      },
      data: {
        avatar_url: result.secure_url
      }
    });

    return {
      avatar_url: updatedUser.avatar_url
    };
  } catch {
    throw new AppError({
      statusCode: 500,
      code: "UPLOAD_FAILED",
      message: "Lỗi upload avatar"
    });
  }
}

module.exports = {
  changePassword,
  deleteAccount,
  deleteAvatar,
  getMe,
  updateDisplayName,
  updateProfile,
  uploadAvatar
};
