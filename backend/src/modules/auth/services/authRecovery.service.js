const bcrypt = require("bcrypt");
const crypto = require("crypto");

const env = require("../../../config/env");
const prisma = require("../../../config/prisma");
const { AppError } = require("../../../utils/appError");
const { buildAccessToken, storeRefreshToken } = require("./authToken.service");

function buildRecoveryPreview(code, displayOrder) {
  if (displayOrder <= 4) {
    return `${code.slice(0, 4)}-****`;
  }

  return "****-****";
}

function generateRecoveryCodes() {
  return Array.from({ length: 8 }, () => {
    const first = crypto.randomBytes(2).toString("hex").toUpperCase();
    const second = crypto.randomBytes(2).toString("hex").toUpperCase();
    return `${first}-${second}`;
  });
}

async function hashPassword(password) {
  return bcrypt.hash(password, env.BCRYPT_ROUNDS);
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

module.exports = {
  getRecoveryCodes,
  hashPassword,
  recover,
  regenerateRecoveryCodes,
  register
};
