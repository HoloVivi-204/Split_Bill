const crypto = require('crypto');

const prisma = require('../../config/prisma');
const { AppError } = require('../../utils/appError');
const { createNotification, emitNotifications } = require('../../utils/notification');
const { createSystemMessage } = require('../../utils/systemMessage');

function toIsoDate(value) {
  return value.toISOString().slice(0, 10);
}

function roundCurrency(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function buildDateValue(value) {
  const parsedDate = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new AppError({
      statusCode: 422,
      code: 'VALIDATION_ERROR',
      message: 'Hạn đóng quỹ không hợp lệ'
    });
  }

  return parsedDate;
}

function assertFutureDate(value) {
  const dueDate = buildDateValue(value);
  const today = new Date();
  const todayStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

  if (dueDate <= todayStart) {
    throw new AppError({
      statusCode: 422,
      code: 'DUE_DATE_IN_PAST',
      message: 'Hạn đóng phải ở tương lai'
    });
  }

  return dueDate;
}

function buildCampaignCode() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
}

function buildTransferCode(campaignCode, index) {
  return `QUY-${campaignCode}-${String(index + 1).padStart(3, '0')}`;
}

function calculateSuggestedAmount(amountPerPerson, paymentFrequency) {
  if (paymentFrequency === 'one_time') {
    return roundCurrency(amountPerPerson);
  }

  if (paymentFrequency === 'monthly') {
    return roundCurrency(amountPerPerson / 4);
  }

  if (paymentFrequency === 'biweekly') {
    return roundCurrency(amountPerPerson / 2);
  }

  return roundCurrency(amountPerPerson / 4);
}

function buildCampaignSummary(contributions) {
  return contributions.reduce(
    (summary, contribution) => {
      summary.total += 1;

      if (contribution.status === 'paid') {
        summary.paid += 1;
      } else if (contribution.status === 'late') {
        summary.late += 1;
      } else if (contribution.status === 'pending') {
        summary.pending += 1;
      }

      return summary;
    },
    {
      total: 0,
      pending: 0,
      paid: 0,
      late: 0
    }
  );
}

function buildCampaignListItem(campaign) {
  return {
    id: campaign.id,
    title: campaign.title,
    amount_per_person: Number(campaign.amount_per_person),
    due_date: toIsoDate(campaign.due_date),
    status: campaign.status,
    contributions_summary: buildCampaignSummary(campaign.contributions)
  };
}

function buildCampaignDetailResponse(campaign) {
  return {
    id: campaign.id,
    title: campaign.title,
    description: campaign.description,
    amount_per_person: Number(campaign.amount_per_person),
    payment_frequency: campaign.payment_frequency,
    suggested_amount_per_payment: Number(campaign.suggested_amount_per_payment),
    due_date: toIsoDate(campaign.due_date),
    status: campaign.status,
    created_by: {
      user_id: campaign.creator.id,
      display_name: campaign.creator.display_name || null
    },
    created_at: campaign.created_at,
    contributions_summary: buildCampaignSummary(campaign.contributions)
  };
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

function assertCampaignIsActive(campaign) {
  if (campaign.status !== 'active') {
    throw new AppError({
      statusCode: 409,
      code: 'CAMPAIGN_ALREADY_CLOSED',
      message: 'Đợt thu đã đóng'
    });
  }
}

async function createCampaign(groupId, actorUserId, input, io) {
  const dueDate = assertFutureDate(input.due_date);
  const amountPerPerson = roundCurrency(input.amount_per_person);
  const suggestedAmount = calculateSuggestedAmount(amountPerPerson, input.payment_frequency);
  const campaignCode = buildCampaignCode();
  let notifications = [];

  const campaign = await prisma.$transaction(async (tx) => {
    const activeMembers = await tx.groupMember.findMany({
      where: {
        group_id: groupId,
        status: 'active'
      },
      select: {
        user_id: true,
        joined_at: true
      },
      orderBy: {
        joined_at: 'asc'
      }
    });

    const createdCampaign = await tx.fundCampaign.create({
      data: {
        group_id: groupId,
        title: input.title,
        description: input.description?.trim() || null,
        amount_per_person: amountPerPerson,
        payment_frequency: input.payment_frequency,
        suggested_amount_per_payment: suggestedAmount,
        due_date: dueDate,
        created_by: actorUserId,
        campaign_code: campaignCode,
        contributions: {
          create: activeMembers.map((member, index) => ({
            user_id: member.user_id,
            amount_required: amountPerPerson,
            transfer_code: buildTransferCode(campaignCode, index)
          }))
        }
      },
      include: {
        contributions: {
          select: {
            status: true
          }
        }
      }
    });

    await createSystemMessage(tx, groupId, `Đợt thu '${input.title}' vừa được tạo`);

    notifications = (
      await Promise.all(
        activeMembers
          .filter((member) => member.user_id !== actorUserId)
          .map((member) =>
            createNotification(tx, {
              user_id: member.user_id,
              group_id: groupId,
              type: 'campaign_created',
              title: 'Đợt thu mới',
              body: `${input.title} vừa được tạo`
            })
          )
      )
    ).filter(Boolean);

    return createdCampaign;
  });

  emitNotifications(io, notifications);

  return {
    id: campaign.id,
    title: campaign.title,
    description: campaign.description,
    amount_per_person: Number(campaign.amount_per_person),
    payment_frequency: campaign.payment_frequency,
    suggested_amount_per_payment: Number(campaign.suggested_amount_per_payment),
    due_date: toIsoDate(campaign.due_date),
    status: campaign.status,
    created_at: campaign.created_at,
    contributions_summary: buildCampaignSummary(campaign.contributions)
  };
}

async function listCampaigns(groupId, query) {
  const where = {
    group_id: groupId
  };

  if (query.status && query.status !== 'all') {
    where.status = query.status;
  }

  const campaigns = await prisma.fundCampaign.findMany({
    where,
    orderBy: [{ due_date: 'desc' }, { created_at: 'desc' }],
    include: {
      contributions: {
        select: {
          status: true
        }
      }
    }
  });

  return campaigns.map(buildCampaignListItem);
}

async function getCampaignDetail(groupId, campaignId) {
  const campaign = await prisma.fundCampaign.findUnique({
    where: {
      id: campaignId
    },
    include: {
      creator: {
        select: {
          id: true,
          display_name: true
        }
      },
      contributions: {
        select: {
          status: true
        }
      }
    }
  });

  assertCampaignExists(campaign, groupId);

  return buildCampaignDetailResponse(campaign);
}

async function updateCampaign(groupId, campaignId, input) {
  const currentCampaign = await prisma.fundCampaign.findUnique({
    where: {
      id: campaignId
    },
    include: {
      creator: {
        select: {
          id: true,
          display_name: true
        }
      },
      contributions: {
        select: {
          status: true
        }
      }
    }
  });

  assertCampaignExists(currentCampaign, groupId);
  assertCampaignIsActive(currentCampaign);

  const amountPerPerson = roundCurrency(
    input.amount_per_person ?? Number(currentCampaign.amount_per_person)
  );
  const paymentFrequency = input.payment_frequency ?? currentCampaign.payment_frequency;
  const dueDate = input.due_date ? assertFutureDate(input.due_date) : currentCampaign.due_date;

  const updatedCampaign = await prisma.fundCampaign.update({
    where: {
      id: campaignId
    },
    data: {
      ...(input.title ? { title: input.title } : {}),
      ...(input.description !== undefined
        ? { description: input.description?.trim() || null }
        : {}),
      ...(input.amount_per_person !== undefined ? { amount_per_person: amountPerPerson } : {}),
      ...(input.payment_frequency ? { payment_frequency: paymentFrequency } : {}),
      ...(input.due_date ? { due_date: dueDate } : {}),
      ...(input.amount_per_person !== undefined || input.payment_frequency !== undefined
        ? { suggested_amount_per_payment: calculateSuggestedAmount(amountPerPerson, paymentFrequency) }
        : {})
    },
    include: {
      creator: {
        select: {
          id: true,
          display_name: true
        }
      },
      contributions: {
        select: {
          status: true
        }
      }
    }
  });

  return buildCampaignDetailResponse(updatedCampaign);
}

async function mutateCampaign(groupId, campaignId, action) {
  const campaign = await prisma.fundCampaign.findUnique({
    where: {
      id: campaignId
    },
    include: {
      contributions: {
        select: {
          status: true
        }
      }
    }
  });

  assertCampaignExists(campaign, groupId);
  assertCampaignIsActive(campaign);

  if (action === 'close') {
    const hasPendingContribution = campaign.contributions.some(
      (contribution) => contribution.status === 'pending'
    );

    if (hasPendingContribution) {
      throw new AppError({
        statusCode: 409,
        code: 'CAMPAIGN_HAS_PENDING',
        message: 'Còn thành viên chưa đóng đủ quỹ'
      });
    }
  }

  const nextStatus = action === 'close' ? 'closed' : 'cancelled';
  await prisma.fundCampaign.update({
    where: {
      id: campaignId
    },
    data: {
      status: nextStatus
    }
  });

  return {
    message: action === 'close' ? 'Đợt thu đã được đóng' : 'Đợt thu đã được hủy',
    status: nextStatus
  };
}

async function listContributions(groupId, campaignId) {
  const campaign = await prisma.fundCampaign.findUnique({
    where: {
      id: campaignId
    }
  });

  assertCampaignExists(campaign, groupId);

  const contributions = await prisma.fundContribution.findMany({
    where: {
      campaign_id: campaignId
    },
    orderBy: {
      transfer_code: 'asc'
    },
    include: {
      user: {
        select: {
          display_name: true,
          avatar_url: true,
          group_members: {
            where: {
              group_id: groupId
            },
            select: {
              animal_avatar: true
            },
            take: 1
          }
        }
      }
    }
  });

  const summary = contributions.reduce(
    (result, contribution) => {
      result.total_members += 1;
      result[contribution.status] += 1;
      return result;
    },
    {
      total_members: 0,
      paid: 0,
      pending: 0,
      late: 0,
      kicked: 0
    }
  );

  return {
    campaign: {
      title: campaign.title,
      due_date: toIsoDate(campaign.due_date),
      amount_per_person: Number(campaign.amount_per_person)
    },
    summary: {
      total_members: summary.total_members,
      paid: summary.paid,
      pending: summary.pending,
      late: summary.late
    },
    contributions: contributions.map((contribution) => ({
      user_id: contribution.user_id,
      display_name: contribution.user.display_name || null,
      avatar_url: contribution.user.avatar_url || null,
      animal_avatar: contribution.user.group_members[0]?.animal_avatar || null,
      transfer_code: contribution.transfer_code,
      status: contribution.status,
      amount_required: Number(contribution.amount_required),
      amount_paid: Number(contribution.amount_paid),
      fully_paid_at: contribution.fully_paid_at
    }))
  };
}

module.exports = {
  createCampaign,
  listCampaigns,
  getCampaignDetail,
  updateCampaign,
  mutateCampaign,
  listContributions
};
