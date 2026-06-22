const rateLimit = require("express-rate-limit");

const env = require("../config/env");

const buildRateLimiter = (max) =>
  rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Qua nhieu yeu cau. Vui long thu lai sau."
      }
    }
  });

const apiLimiter = buildRateLimiter(100);
const loginRateLimiter = buildRateLimiter(env.RATE_LIMIT_LOGIN_MAX);
const registerRateLimiter = buildRateLimiter(env.RATE_LIMIT_REGISTER_MAX);
const webhookRateLimiter = buildRateLimiter(env.RATE_LIMIT_WEBHOOK_MAX);

module.exports = {
  apiLimiter,
  loginRateLimiter,
  registerRateLimiter,
  webhookRateLimiter
};
