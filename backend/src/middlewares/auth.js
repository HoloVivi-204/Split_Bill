const jwt = require("jsonwebtoken");

const env = require("../config/env");
const prisma = require("../config/prisma");
const { AppError } = require("../utils/appError");

function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
}

function authMiddleware(request, _response, next) {
  const authorization = request.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    return next(
      new AppError({
        statusCode: 401,
        code: "TOKEN_MISSING",
        message: "Không tìm thấy token xác thực"
      })
    );
  }

  const token = authorization.slice(7);

  try {
    const payload = verifyAccessToken(token);
    request.user = {
      id: payload.sub,
      email: payload.email
    };
    return next();
  } catch {
    return next(
      new AppError({
        statusCode: 401,
        code: "TOKEN_INVALID",
        message: "Token xác thực không hợp lệ"
      })
    );
  }
}

async function handleSocketAuth(socket, next) {
  const authToken = socket.handshake.auth?.token;
  const authorizationHeader = socket.handshake.headers?.authorization;
  const token = authToken || (authorizationHeader?.startsWith("Bearer ")
    ? authorizationHeader.slice(7)
    : null);

  if (!token) {
    next(new Error("UNAUTHORIZED"));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: {
        id: payload.sub
      },
      select: {
        display_name: true
      }
    });

    socket.user = {
      id: payload.sub,
      email: payload.email,
      display_name: user?.display_name || null
    };
    next();
  } catch {
    next(new Error("TOKEN_INVALID"));
  }
}

module.exports = {
  authMiddleware,
  handleSocketAuth,
  verifyAccessToken
};
