const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const env = require("../../config/env");
const prisma = require("../../config/prisma");
const { AppError } = require("../../utils/appError");
const { deleteImage, uploadImage } = require("../../utils/cloudinary");
const { calculateBalanceMap, roundMoney } = require("../../utils/debtSettlement");

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_COOKIE_NAME = "refresh_token";
const DELETED_ACCOUNT_DISPLAY_NAME = "Tài khoản đã xoá";
const REFRESH_TTL_SECONDS = {
  normal: 7 * 24 * 60 * 60,
  remember: 30 * 24 * 60 * 60
};

function getFirstFrontendUrl() {
  return env.FRONTEND_URL.split(",")[0]?.trim() || "";
}

function getUrlHostname(value) {
  if (!value) {
    return "";
  }

  try {
    return new URL(value).hostname;
  } catch {
    return "";
  }
}

function shouldUseCrossSiteRefreshCookie() {
  if (env.NODE_ENV !== "production" || !env.BACKEND_URL) {
    return false;
  }

  const frontendHost = getUrlHostname(getFirstFrontendUrl());
  const backendHost = getUrlHostname(env.BACKEND_URL);

  return Boolean(frontendHost && backendHost && frontendHost !== backendHost);
}

function buildAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email
    },
    env.JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );
}

function buildRefreshToken() {
  return crypto.randomUUID();
}

function hashRefreshToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getRemainingRefreshMaxAge(expiresAt) {
  return Math.max(1, expiresAt.getTime() - Date.now());
}

function buildRecoveryPreview(code, displayOrder) {
  if (displayOrder <= 4) {
    return `${code.slice(0, 4)}-****`;
  }

  return "****-****";
}

function buildDeletedAccountEmail(userId) {
  return `deleted-${userId}@deleted.splitbill.local`;
}

function generateRecoveryCodes() {
  return Array.from({ length: 8 }, () => {
    const first = crypto.randomBytes(2).toString("hex").toUpperCase();
    const second = crypto.randomBytes(2).toString("hex").toUpperCase();
    return `${first}-${second}`;
  });
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

async function hashPassword(password) {
  return bcrypt.hash(password, env.BCRYPT_ROUNDS);
}

async function storeRefreshToken(userId, rememberMe) {
  const rawToken = buildRefreshToken();
  const tokenHash = hashRefreshToken(rawToken);
  const ttlSeconds = rememberMe ? REFRESH_TTL_SECONDS.remember : REFRESH_TTL_SECONDS.normal;
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

  await prisma.refreshToken.create({
    data: {
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expiresAt
    }
  });

  return {
    token: rawToken,
    maxAge: ttlSeconds * 1000
  };
}

async function register(input) {
  const existingUser = await prisma.user.findUnique({
    where: {
      email: input.email
    }
  });

  if (existingUser) {
    throw new AppError({
      statusCode: 409,
      code: "EMAIL_ALREADY_EXISTS",
      message: "Email này đã được sử dụng bởi tài khoản khác"
    });
  }

  const passwordHash = await hashPassword(input.password);
  const recoveryCodes = generateRecoveryCodes();

  const createdUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: input.email,
        password_hash: passwordHash
      }
    });

    const recoveryRows = await Promise.all(
      recoveryCodes.map(async (code, index) => ({
        user_id: user.id,
        code_hash: await bcrypt.hash(code, env.BCRYPT_ROUNDS),
        code_preview: buildRecoveryPreview(code, index + 1),
        display_order: index + 1
      }))
    );

    await tx.recoveryCode.createMany({
      data: recoveryRows
    });

    return user;
  });

  const refreshToken = await storeRefreshToken(createdUser.id, input.remember_me);

  return {
    data: {
      user: {
        id: createdUser.id,
        email: createdUser.email,
        display_name: createdUser.display_name
      },
      access_token: buildAccessToken(createdUser),
      recovery_codes: recoveryCodes,
      display_name_required: true
    },
    refreshToken
  };
}

async function login(input) {
  const user = await prisma.user.findUnique({
    where: {
      email: input.email
    }
  });

  if (!user) {
    throw new AppError({
      statusCode: 401,
      code: "INVALID_CREDENTIALS",
      message: "Email hoặc mật khẩu không chính xác"
    });
  }

  const isPasswordValid = await bcrypt.compare(input.password, user.password_hash);

  if (!isPasswordValid) {
    throw new AppError({
      statusCode: 401,
      code: "INVALID_CREDENTIALS",
      message: "Email hoặc mật khẩu không chính xác"
    });
  }

  const refreshToken = await storeRefreshToken(user.id, input.remember_me);

  return {
    data: {
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        avatar_url: user.avatar_url || null
      },
      access_token: buildAccessToken(user),
      display_name_required: !user.display_name
    },
    refreshToken
  };
}

async function refresh(rawRefreshToken) {
  if (!rawRefreshToken) {
    throw new AppError({
      statusCode: 401,
      code: "REFRESH_TOKEN_MISSING",
      message: "Không tìm thấy refresh token"
    });
  }

  const tokenHash = hashRefreshToken(rawRefreshToken);
  const storedToken = await prisma.refreshToken.findUnique({
    where: {
      token_hash: tokenHash
    },
    include: {
      user: true
    }
  });

  if (!storedToken || storedToken.revoked_at || storedToken.expires_at <= new Date()) {
    throw new AppError({
      statusCode: 401,
      code: "REFRESH_TOKEN_INVALID",
      message: "Refresh token không hợp lệ hoặc đã hết hạn"
    });
  }

  const nextRefreshToken = await prisma.$transaction(async (tx) => {
    await tx.refreshToken.update({
      where: {
        id: storedToken.id
      },
      data: {
        revoked_at: new Date()
      }
    });

    const token = buildRefreshToken();
    const nextHash = hashRefreshToken(token);
    const maxAge = getRemainingRefreshMaxAge(storedToken.expires_at);

    await tx.refreshToken.create({
      data: {
        user_id: storedToken.user_id,
        token_hash: nextHash,
        expires_at: storedToken.expires_at
      }
    });

    return {
      token,
      maxAge
    };
  });

  return {
    data: {
      access_token: buildAccessToken(storedToken.user)
    },
    refreshToken: nextRefreshToken
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

async function logout(rawRefreshToken) {
  if (rawRefreshToken) {
    await prisma.refreshToken.updateMany({
      where: {
        token_hash: hashRefreshToken(rawRefreshToken),
        revoked_at: null
      },
      data: {
        revoked_at: new Date()
      }
    });
  }

  return {
    message: "Đăng xuất thành công"
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

async function recover(input) {
  const user = await prisma.user.findUnique({
    where: {
      email: input.email
    },
    include: {
      recovery_codes: {
        orderBy: {
          display_order: "asc"
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

  const availableCodes = user.recovery_codes.filter((code) => !code.used_at);
  let matchedCode = null;

  for (const code of availableCodes) {
    /* Sequential compare over a fixed max of 8 codes keeps the logic simple. */
    if (await bcrypt.compare(input.recovery_code, code.code_hash)) {
      matchedCode = code;
      break;
    }
  }

  if (!matchedCode) {
    throw new AppError({
      statusCode: 401,
      code: "INVALID_RECOVERY_CODE",
      message: "Mã khôi phục không hợp lệ hoặc đã được sử dụng"
    });
  }

  const nextPasswordHash = await hashPassword(input.new_password);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: {
        id: user.id
      },
      data: {
        password_hash: nextPasswordHash
      }
    });

    await tx.recoveryCode.update({
      where: {
        id: matchedCode.id
      },
      data: {
        used_at: new Date()
      }
    });

    await tx.refreshToken.updateMany({
      where: {
        user_id: user.id,
        revoked_at: null
      },
      data: {
        revoked_at: new Date()
      }
    });
  });

  return {
    message: "Đặt lại mật khẩu thành công. Tất cả thiết bị đã bị đăng xuất."
  };
}

async function getRecoveryCodes(userId) {
  const codes = await prisma.recoveryCode.findMany({
    where: {
      user_id: userId
    },
    orderBy: {
      display_order: "asc"
    }
  });

  return {
    codes: codes.map((code) => ({
      index: code.display_order,
      preview: code.code_preview || "****-****",
      used: Boolean(code.used_at)
    })),
    active_count: codes.filter((code) => !code.used_at).length
  };
}

async function regenerateRecoveryCodes(userId, password) {
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

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);

  if (!isPasswordValid) {
    throw new AppError({
      statusCode: 401,
      code: "CURRENT_PASSWORD_INCORRECT",
      message: "Mật khẩu hiện tại không chính xác"
    });
  }

  const recoveryCodes = generateRecoveryCodes();

  await prisma.$transaction(async (tx) => {
    await tx.recoveryCode.deleteMany({
      where: {
        user_id: userId
      }
    });

    const recoveryRows = await Promise.all(
      recoveryCodes.map(async (code, index) => ({
        user_id: userId,
        code_hash: await bcrypt.hash(code, env.BCRYPT_ROUNDS),
        code_preview: buildRecoveryPreview(code, index + 1),
        display_order: index + 1
      }))
    );

    await tx.recoveryCode.createMany({
      data: recoveryRows
    });
  });

  return {
    recovery_codes: recoveryCodes
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

function buildBaseRefreshCookieOptions() {
  return {
    httpOnly: true,
    sameSite: shouldUseCrossSiteRefreshCookie() ? "none" : "strict",
    secure: env.NODE_ENV === "production",
    signed: false,
    path: "/api/auth"
  };
}

function buildRefreshCookieOptions(maxAge) {
  return {
    ...buildBaseRefreshCookieOptions(),
    maxAge
  };
}

function buildClearRefreshCookieOptions() {
  return buildBaseRefreshCookieOptions();
}

module.exports = {
  REFRESH_COOKIE_NAME,
  buildClearRefreshCookieOptions,
  buildRefreshCookieOptions,
  register,
  login,
  refresh,
  getMe,
  updateProfile,
  updateDisplayName,
  changePassword,
  logout,
  deleteAccount,
  recover,
  getRecoveryCodes,
  regenerateRecoveryCodes,
  deleteAvatar,
  uploadAvatar
};
