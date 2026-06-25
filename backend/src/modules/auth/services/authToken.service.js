const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const env = require("../../../config/env");
const prisma = require("../../../config/prisma");
const { AppError } = require("../../../utils/appError");

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_COOKIE_NAME = "refresh_token";
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

  const bcrypt = require("bcrypt");
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
  buildAccessToken,
  buildClearRefreshCookieOptions,
  buildRefreshCookieOptions,
  login,
  logout,
  refresh,
  storeRefreshToken
};
