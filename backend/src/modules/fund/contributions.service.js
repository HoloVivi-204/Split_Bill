const prisma = require('../../config/prisma');
const { AppError } = require('../../utils/appError');
const { createNotification, emitNotifications } = require('../../utils/notification');
const { createSystemMessage } = require('../../utils/systemMessage');
const { generateVietQRUrl } = require('../../utils/vietqr');

function toIsoDate(value) {
  return value.toISOString().slice(0, 10);
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

function buildQrInfo(qrConfig, transferContent) {
  if (!qrConfig) {
    throw new AppError({
      statusCode: 404,
      code: 'QR_NOT_CONFIGURED',
      message: 'Thư ký chưa cấu hình tài khoản ngân hàng'
    });
  }

  return {
    bank_name: qrConfig.bank_name,
    account_number: qrConfig.account_number,
    account_name: qrConfig.account_name,
    transfer_content: transferContent,
    qr_url: generateVietQRUrl(
      qrConfig.bank_id,
      qrConfig.account_number,
      qrConfig.account_name,
      transferContent
    )
  };
}

async function getMyContribution(groupId, campaignId, actorUserId) {
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

  return {
    campaign: {
      title: campaign.title,
      due_date: toIsoDate(campaign.due_date),
      amount_per_person: Number(campaign.amount_per_person),
      suggested_amount_per_payment: Number(campaign.suggested_amount_per_payment)
    },
    my_contribution: {
      transfer_code: contribution.transfer_code,
      status: contribution.status,
      amount_required: Number(contribution.amount_required),
      amount_paid: Number(contribution.amount_paid),
      remaining: Math.max(0, Number(contribution.amount_required) - Number(contribution.amount_paid)),
      fully_paid_at: contribution.fully_paid_at
    },
    qr_info: buildQrInfo(qrConfig, contribution.transfer_code)
  };
}

function assertContributionMutable(contribution) {
  if (contribution.status === 'paid') {
    throw new AppError({
      statusCode: 409,
      code: 'CONTRIBUTION_ALREADY_PAID',
      message: 'Thành viên đã đóng đủ'
    });
  }
}

async function findContributionWithContext(tx, contributionId) {
  return tx.fundContribution.findUnique({
    where: {
      id: contributionId
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
}

async function buildAllPaidNotification(tx, campaignId, groupId, campaignTitle) {
  const paidStatuses =
    (await tx.fundContribution.findMany({
    where: {
      campaign_id: campaignId
    },
    select: {
      status: true
    }
    })) || [];

  const allPaid = paidStatuses.length > 0 && paidStatuses.every((item) => item.status === 'paid');
  if (!allPaid) {
    return [];
  }

  if (!tx.groupMember?.findMany) {
    return [];
  }

  const leaders = await tx.groupMember.findMany({
    where: {
      group_id: groupId,
      role: 'leader',
      status: 'active'
    },
    select: {
      user_id: true
    }
  });

  return Promise.all(
    leaders.map((leader) =>
      createNotification(tx, {
        user_id: leader.user_id,
        group_id: groupId,
        type: 'fund_complete',
        title: 'Đợt thu đã hoàn tất',
        body: `${campaignTitle} đã hoàn tất`
      })
    )
  );
}

async function applyContributionPayment(tx, input) {
  const contribution = await findContributionWithContext(tx, input.contributionId);

  if (!contribution) {
    throw new AppError({
      statusCode: 404,
      code: 'CONTRIBUTION_NOT_FOUND',
      message: 'Không tìm thấy thông tin đóng quỹ'
    });
  }

  assertContributionMutable(contribution);

  const amountRequired = Number(contribution.amount_required);
  const amountPaid = Number(contribution.amount_paid);
  const remaining = Math.max(0, amountRequired - amountPaid);
  const requestedAmount = Number(input.amount);
  const appliedAmount = Math.min(requestedAmount, remaining);
  const overpaymentAmount = Math.max(0, requestedAmount - appliedAmount);
  const nextAmountPaid = amountPaid + appliedAmount;
  const shouldMarkPaid = nextAmountPaid >= amountRequired && contribution.status !== 'kicked';
  const fullyPaidAt = shouldMarkPaid ? contribution.fully_paid_at || input.paidAt || new Date() : contribution.fully_paid_at;
  const nextStatus = shouldMarkPaid ? 'paid' : contribution.status;

  let payment = null;

  if (appliedAmount > 0) {
    payment = await tx.fundContributionPayment.create({
      data: {
        contribution_id: contribution.id,
        amount: appliedAmount,
        paid_at: input.paidAt,
        method: input.method,
        transaction_ref: input.transactionRef || null,
        sepay_transaction_id: input.sepayTransactionId || null,
        confirmed_by: input.confirmedBy || null,
        note: input.note?.trim() || null
      }
    });
  }

  const updatedContribution = await tx.fundContribution.update({
    where: {
      id: contribution.id
    },
    data: {
      amount_paid: nextAmountPaid,
      status: nextStatus,
      fully_paid_at: fullyPaidAt
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

  const notifications = [];

  if (appliedAmount > 0) {
    notifications.push(
      await createNotification(tx, {
        user_id: contribution.user_id,
        group_id: contribution.campaign.group_id,
        type: nextStatus === 'paid' ? 'fund_paid' : 'fund_reminder',
        title: 'Xác nhận đóng quỹ',
        body:
          nextStatus === 'paid'
            ? `Đã đóng đủ ${contribution.campaign.title}`
            : `Đã nhận ${appliedAmount} cho ${contribution.campaign.title}`
      })
    );
  }

  if (overpaymentAmount > 0 && tx.groupMember?.findFirst) {
    const secretary = await tx.groupMember.findFirst({
      where: {
        group_id: contribution.campaign.group_id,
        role: 'secretary',
        status: 'active'
      },
      select: {
        user_id: true
      }
    });

    if (secretary) {
      notifications.push(
        await createNotification(tx, {
          user_id: secretary.user_id,
          group_id: contribution.campaign.group_id,
          type: 'overpayment_alert',
          title: 'Cần xử lý thủ công',
          body: `${contribution.user.display_name || 'Thành viên'} đóng dư ${overpaymentAmount}`
        })
      );
    }
  }

  const allPaidNotifications = shouldMarkPaid
    ? await buildAllPaidNotification(
        tx,
        contribution.campaign.id,
        contribution.campaign.group_id,
        contribution.campaign.title
      )
    : [];

  notifications.push(...allPaidNotifications.filter(Boolean));

  if (appliedAmount > 0 && shouldMarkPaid) {
    await createSystemMessage(
      tx,
      contribution.campaign.group_id,
      `${updatedContribution.user.display_name || 'Thành viên'} vừa đóng quỹ ${updatedContribution.campaign.title}`
    );
  }

  return {
    applied: appliedAmount > 0 || overpaymentAmount > 0,
    applied_amount: appliedAmount,
    overpayment_amount: overpaymentAmount,
    contribution: updatedContribution,
    payment,
    notifications: notifications.filter(Boolean),
    member_name: updatedContribution.user.display_name || null,
    campaign_title: updatedContribution.campaign.title,
    group_id: updatedContribution.campaign.group_id
  };
}

async function confirmContribution(groupId, campaignId, targetUserId, confirmerUserId, input, io) {
  const campaign = await prisma.fundCampaign.findUnique({
    where: {
      id: campaignId
    }
  });
  assertCampaignExists(campaign, groupId);

  const result = await prisma.$transaction(async (tx) => {
    const contribution = await tx.fundContribution.findUnique({
      where: {
        campaign_id_user_id: {
          campaign_id: campaignId,
          user_id: targetUserId
        }
      },
      include: {
        user: {
          select: {
            display_name: true
          }
        }
      }
    });
    assertContributionExists(contribution, campaignId, targetUserId);
    return applyContributionPayment(tx, {
      contributionId: contribution.id,
      amount: Number(input.amount),
      paidAt: new Date(),
      method: 'manual',
      confirmedBy: confirmerUserId,
      note: input.note
    });
  });

  emitNotifications(io, result.notifications);

  return {
    contribution: {
      user_id: targetUserId,
      display_name: result.contribution.user.display_name || null,
      status: result.contribution.status,
      amount_required: Number(result.contribution.amount_required),
      amount_paid: Number(result.contribution.amount_paid),
      fully_paid_at: result.contribution.fully_paid_at
    },
    payment: {
      id: result.payment.id,
      amount: Number(result.payment.amount),
      method: result.payment.method,
      confirmed_by: confirmerUserId,
      note: result.payment.note,
      paid_at: result.payment.paid_at
    }
  };
}

async function listContributionHistory(groupId, campaignId) {
  const campaign = await prisma.fundCampaign.findUnique({
    where: {
      id: campaignId
    }
  });
  assertCampaignExists(campaign, groupId);

  const history = await prisma.fundContributionPayment.findMany({
    where: {
      contribution: {
        campaign_id: campaignId
      }
    },
    orderBy: {
      paid_at: 'asc'
    },
    include: {
      contribution: {
        include: {
          user: {
            select: {
              display_name: true
            }
          }
        }
      },
      confirmer: {
        select: {
          display_name: true
        }
      }
    }
  });

  return {
    campaign: {
      title: campaign.title,
      due_date: toIsoDate(campaign.due_date),
      amount_per_person: Number(campaign.amount_per_person)
    },
    history: history.map((item) => ({
      user_name: item.contribution.user.display_name || null,
      amount: Number(item.amount),
      cumulative_paid: Number(item.contribution.amount_paid),
      amount_required: Number(item.contribution.amount_required),
      paid_at: item.paid_at,
      method: item.method,
      confirmed_by_name: item.confirmer?.display_name || null,
      note: item.note
    }))
  };
}

module.exports = {
  getMyContribution,
  applyContributionPayment,
  confirmContribution,
  listContributionHistory
};
