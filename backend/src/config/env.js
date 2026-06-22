const dotenv = require("dotenv");
const { z } = require("zod");

dotenv.config();

const parseInteger = (fallback) =>
  z.coerce.number().int().positive().default(fallback);

const rawEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32).optional(),
  JWT_SECRET: z.string().min(32).optional(),
  JWT_REFRESH_SECRET: z.string().min(32),
  COOKIE_SECRET: z.string().min(16),
  PORT: parseInteger(3000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  FRONTEND_URL: z.string().min(1),
  BACKEND_URL: z.string().url().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
  SEPAY_TIMESTAMP_TOLERANCE_SECONDS: parseInteger(300),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).default(10),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  APP_TIMEZONE: z.string().default("Asia/Ho_Chi_Minh"),
  JSON_BODY_LIMIT: z.string().default("1mb"),
  WEBHOOK_BODY_LIMIT: z.string().default("256kb"),
  MAX_IMAGE_SIZE_MB: z.coerce.number().positive().default(5),
  RATE_LIMIT_LOGIN_MAX: parseInteger(5),
  RATE_LIMIT_REGISTER_MAX: parseInteger(10),
  RATE_LIMIT_WEBHOOK_MAX: parseInteger(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  VIETQR_API_BASE_URL: z.string().url().default("https://api.vietqr.io/v2"),
  VIETQR_CLIENT_ID: z.string().min(1).optional(),
  VIETQR_API_KEY: z.string().min(1).optional(),
  VIETQR_LOOKUP_TIMEOUT_MS: z.coerce.number().int().positive().default(8000)
});

const rawEnv = rawEnvSchema.parse(process.env);

const accessSecret = rawEnv.JWT_ACCESS_SECRET || rawEnv.JWT_SECRET;

function parseFrontendOrigins(value) {
  const origins = value.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    throw new Error("Missing FRONTEND_URL. Set at least one frontend origin.");
  }

  for (const origin of origins) {
    try {
      new URL(origin);
    } catch {
      throw new Error(`Invalid FRONTEND_URL origin: ${origin}`);
    }
  }

  return origins;
}

if (!accessSecret) {
  throw new Error("Missing JWT access secret. Set JWT_ACCESS_SECRET or JWT_SECRET.");
}

if (rawEnv.NODE_ENV === "production" && !rawEnv.BACKEND_URL) {
  throw new Error("Missing BACKEND_URL. Production SePay webhook URLs must be public.");
}

const frontendOrigins = parseFrontendOrigins(rawEnv.FRONTEND_URL);

module.exports = Object.freeze({
  ...rawEnv,
  JWT_ACCESS_SECRET: accessSecret,
  corsOrigins: frontendOrigins
});
