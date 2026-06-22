const crypto = require('crypto');

const prisma = require('../../config/prisma');
const env = require('../../config/env');
const { AppError } = require('../../utils/appError');
const { generateVietQRUrl } = require('../../utils/vietqr');
const { resolveBankAccount } = require('../banks/banks.service');

function buildWebhookConfigId() {
  return `whcfg_${crypto.randomUUID().replace(/-/g, '').slice(0, 18)}`;
}

function buildWebhookSecret() {
  return `whsec_${crypto.randomBytes(24).toString('base64url')}`;
}

function buildWebhookPath(webhookConfigId) {
  return `/api/webhooks/sepay/${webhookConfigId}`;
}

function buildWebhookUrl(webhookConfigId) {
  const path = buildWebhookPath(webhookConfigId);

  if (!env.BACKEND_URL) {
    return path;
  }

  return `${env.BACKEND_URL.replace(/\/$/, '')}${path}`;
}

function buildWebhookSecretPreview(secret) {
  if (!secret) {
    return null;
  }

  return `${secret.slice(0, 10)}...${secret.slice(-3)}`;
}

function assertCampaignExists(campaign, groupId) {
  if (!campaign || campaign.group_id !== groupId) {
    throw new AppError({
      statusCode: 404,
      code: 'CAMPAIGN_NOT_FOUND',
      message: 'Đợt thu không tồn tại'
    });
  }
}

function assertContributionExists(contribution, campaignId, userId) {
  if (!contribution || contribution.campaign_id !== campaignId || contribution.user_id !== userId) {
    throw new AppError({
      statusCode: 404,
      code: 'CONTRIBUTION_NOT_FOUND',
      message: 'Không tìm thấy thông tin đóng quỹ'
    });
  }
}

function assertActiveQrConfigured(qrConfig) {
  if (!qrConfig) {
    throw new AppError({
      statusCode: 404,
      code: 'QR_NOT_CONFIGURED',
      message: 'Thư ký chưa cấu hình tài khoản ngân hàng'
    });
  }
}

function assertQrBelongsToGroup(qrConfig, groupId) {
  if (!qrConfig || qrConfig.group_id !== groupId) {
    throw new AppError({
      statusCode: 404,
      code: 'QR_NOT_CONFIGURED',
      message: 'Thư ký chưa cấu hình tài khoản ngân hàng'
    });
  }
}

async function createQr(groupId, actorUserId, input) {
  const bankInfo = await resolveBankAccount({
    bankId: input.bank_id,
    accountNumber: input.account_number
  });
  const webhookConfigId = buildWebhookConfigId();
  const webhookSecret = buildWebhookSecret();
  const qrConfig = await prisma.$transaction(async (tx) => {
    await tx.fundQrCode.updateMany({
      where: {
        group_id: groupId,
        is_active: true
      },
      data: {
        is_active: false
      }
    });

    return tx.fundQrCode.create({
      data: {
        group_id: groupId,
        uploaded_by: actorUserId,
        bank_id: bankInfo.bank_id,
        bank_name: bankInfo.bank_name,
        account_number: bankInfo.account_number,
        account_name: bankInfo.account_name,
        webhook_config_id: webhookConfigId,
        webhook_secret: webhookSecret
      }
    });
  });

  return {
    id: qrConfig.id,
    bank_id: qrConfig.bank_id,
    bank_name: qrConfig.bank_name,
    account_number: qrConfig.account_number,
    account_name: qrConfig.account_name,
    webhook_config_id: qrConfig.webhook_config_id,
    webhook_url: buildWebhookUrl(qrConfig.webhook_config_id),
    webhook_secret: qrConfig.webhook_secret,
    webhook_secret_preview: buildWebhookSecretPreview(qrConfig.webhook_secret),
    is_active: qrConfig.is_active,
    created_at: qrConfig.created_at
  };
}

async function getQr(groupId, campaignId, actorUserId) {
  const campaign = await prisma.fundCampaign.findUnique({
    where: {
      id: campaignId
    }
  });
  assertCampaignExists(campaign, groupId);

  const contribution = await prisma.fundContribution.findUnique({
    where: {
      campaign_id_user_id: {
        campaign_id: campaignId,
        user_id: actorUserId
      }
    }
  });
  assertContributionExists(contribution, campaignId, actorUserId);

  const qrConfig = await prisma.fundQrCode.findFirst({
    where: {
      group_id: groupId,
      is_active: true
    }
  });
  assertActiveQrConfigured(qrConfig);

  return {
    bank_name: qrConfig.bank_name,
    account_number: qrConfig.account_number,
    account_name: qrConfig.account_name,
    transfer_content: contribution.transfer_code,
    qr_url: generateVietQRUrl(
      qrConfig.bank_id,
      qrConfig.account_number,
      qrConfig.account_name,
      contribution.transfer_code
    )
  };
}

async function deleteQr(groupId, qrId) {
  const qrConfig = await prisma.fundQrCode.findUnique({
    where: {
      id: qrId
    }
  });
  assertQrBelongsToGroup(qrConfig, groupId);

  await prisma.fundQrCode.delete({
    where: {
      id: qrId
    }
  });
}

module.exports = {
  createQr,
  getQr,
  deleteQr
};
