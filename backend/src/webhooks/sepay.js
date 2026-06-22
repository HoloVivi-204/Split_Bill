const crypto = require("crypto");
const express = require("express");

const prisma = require("../config/prisma");
const env = require("../config/env");
const { webhookRateLimiter } = require("../middlewares/rateLimit");
const { AppError } = require("../utils/appError");
const { extractTransferCode } = require("../utils/transferCode");
const { applyContributionPayment } = require("../modules/fund/contributions.service");

const router = express.Router();

function buildInvalidSignatureError() {
  return new AppError({
    statusCode: 401,
    code: "INVALID_WEBHOOK_SIGNATURE",
    message: "Chữ ký không hợp lệ hoặc request đã hết hạn"
  });
}

function safeCompare(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function verifySePaySignature(rawBody, signatureHeader, timestampHeader, secret) {
  const timestamp = Number.parseInt(timestampHeader, 10);

  if (!secret || !signatureHeader || !Number.isInteger(timestamp)) {
    return false;
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowInSeconds - timestamp) > env.SEPAY_TIMESTAMP_TOLERANCE_SECONDS) {
    return false;
  }

  const expectedSignature = `sha256=${crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex")}`;

  return safeCompare(expectedSignature, signatureHeader);
}

function parseWebhookPayload(rawBodyBuffer) {
  const rawBody = Buffer.isBuffer(rawBodyBuffer) ? rawBodyBuffer.toString("utf8") : "";

  try {
    return {
      rawBody,
      payload: JSON.parse(rawBody)
    };
  } catch {
    throw buildInvalidSignatureError();
  }
}

function parseSePayDate(value) {
  if (!value) {
    return new Date();
  }

  const normalized = String(value).trim().replace(" ", "T");
  const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(normalized);

  return new Date(hasTimezone ? normalized : `${normalized}+07:00`);
}

function normalizeSePayPayload(payload) {
  const transferType = (payload.transfer_type || payload.transferType || "").toLowerCase();
  const transferAmount = Number(payload.transferAmount || 0);
  const amountIn = Number(payload.amount_in || (transferType === "in" ? transferAmount : 0) || 0);

  return {
    sepayTransactionId: payload.id != null ? String(payload.id) : null,
    referenceNumber: String(payload.reference_number || payload.referenceCode || "").trim() || null,
    transferType,
    amountIn,
    transferContent: [payload.code, payload.transaction_content, payload.content]
      .filter(Boolean)
      .join(" "),
    transactionDate: payload.transaction_date || payload.transactionDate || null
  };
}

async function findExistingPayment(referenceNumber, sepayTransactionId) {
  if (!referenceNumber && !sepayTransactionId) {
    return null;
  }

  const conditions = [];
  if (referenceNumber) {
    conditions.push({ transaction_ref: referenceNumber });
  }
  if (sepayTransactionId) {
    conditions.push({ sepay_transaction_id: sepayTransactionId });
  }

  return prisma.fundContributionPayment.findFirst({
    where: {
      OR: conditions
    }
  });
}

async function findWebhookConfig(configId) {
  if (!configId) {
    return null;
  }

  return prisma.fundQrCode.findUnique({
    where: {
      webhook_config_id: configId
    },
    select: {
      group_id: true,
      webhook_secret: true,
      is_active: true
    }
  });
}

function isIncomingTransfer(normalizedPayload) {
  if (normalizedPayload.transferType && normalizedPayload.transferType !== "in") {
    return false;
  }

  return normalizedPayload.amountIn > 0;
}

async function emitWebhookSideEffects(io, result) {
  if (!io || !result.applied) {
    return;
  }

  for (const notification of result.notifications) {
    if (notification) {
      io.to(`user:${notification.user_id}`).emit("new_notification", {
        notification
      });
    }
  }

  io.to(`group:${result.group_id}`).emit("system_event", {
    content: `${result.member_name} đã đóng quỹ ${result.campaign_title}`
  });
}

async function processWebhook(payload, io, options = {}) {
  const normalizedPayload = normalizeSePayPayload(payload);

  if (!isIncomingTransfer(normalizedPayload)) {
    return {
      applied: false
    };
  }

  const existingPayment = await findExistingPayment(
    normalizedPayload.referenceNumber,
    normalizedPayload.sepayTransactionId
  );
  if (existingPayment) {
    return {
      applied: false
    };
  }

  const transferCode = extractTransferCode(normalizedPayload.transferContent);
  if (!transferCode) {
    return {
      applied: false
    };
  }

  const contribution = await prisma.fundContribution.findUnique({
    where: {
      transfer_code: transferCode
    },
    include: {
      user: {
        select: {
          display_name: true
        }
      },
      campaign: {
        select: {
          id: true,
          group_id: true,
          title: true
        }
      }
    }
  });

  if (!contribution) {
    return {
      applied: false
    };
  }

  if (options.expectedGroupId && contribution.campaign.group_id !== options.expectedGroupId) {
    return {
      applied: false
    };
  }

  if (contribution.status === "paid") {
    return {
      applied: false
    };
  }

  if (normalizedPayload.amountIn <= 0) {
    return {
      applied: false
    };
  }

  const result = await prisma.$transaction(async (tx) =>
    applyContributionPayment(tx, {
      contributionId: contribution.id,
      amount: normalizedPayload.amountIn,
      paidAt: parseSePayDate(normalizedPayload.transactionDate),
      method: "auto",
      transactionRef: normalizedPayload.referenceNumber,
      sepayTransactionId: normalizedPayload.sepayTransactionId,
      note: null
    })
  );

  await emitWebhookSideEffects(io, result);

  return result;
}

async function handleSePayWebhook(request, response, next) {
  try {
    const { rawBody, payload } = parseWebhookPayload(request.body);
    const signatureHeader = request.headers["x-sepay-signature"];
    const timestampHeader = request.headers["x-sepay-timestamp"];
    const webhookConfig = await findWebhookConfig(request.params.configId);

    if (!webhookConfig?.is_active) {
      throw buildInvalidSignatureError();
    }

    if (!verifySePaySignature(rawBody, signatureHeader, timestampHeader, webhookConfig.webhook_secret)) {
      throw buildInvalidSignatureError();
    }

    await processWebhook(payload, request.app.get("io"), {
      expectedGroupId: webhookConfig.group_id
    });

    response.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
}

router.post(
  "/sepay/:configId",
  webhookRateLimiter,
  express.raw({ type: "application/json", limit: env.WEBHOOK_BODY_LIMIT }),
  handleSePayWebhook
);

module.exports = {
  sepayWebhookRouter: router,
  handleSePayWebhook,
  verifySePaySignature,
  parseWebhookPayload,
  normalizeSePayPayload,
  processWebhook
};
