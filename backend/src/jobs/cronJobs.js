const cron = require('node-cron');

const prisma = require('../config/prisma');
const { calculateBalanceMap, roundMoney } = require('../utils/debtSettlement');
const { createNotificationIfMissing } = require('../utils/notification');

const DEBT_THRESHOLD = 1000;
const DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh';

function startOfUtcDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function formatCurrency(amount) {
  return `${Number(amount).toLocaleString('vi-VN')} VND`;
}

function buildExpenseReminderBody(groupName, amount, windowKey) {
  return `Bạn đang nợ ${formatCurrency(amount)} trong nhóm ${groupName} [${windowKey}]`;
}

function buildFundReminderMessage(daysUntilDue) {
  if (daysUntilDue === 3) {
    return 'Còn 3 ngày nữa đến hạn đóng quỹ';
  }

  if (daysUntilDue === 1) {
    return 'Ngày mai là hạn cuối đóng quỹ!';
  }

  if (daysUntilDue === 0) {
    return 'Hôm nay là hạn cuối đóng quỹ!';
  }

  return `Bạn đã quá hạn đóng quỹ ${Math.abs(daysUntilDue)} ngày!`;
}

function buildFundReminderBody(campaignTitle, daysUntilDue, windowKey) {
  return `${buildFundReminderMessage(daysUntilDue)} - ${campaignTitle} [${windowKey}]`;
}

function groupBy(items, keyBuilder) {
  return items.reduce((map, item) => {
    const key = keyBuilder(item);
    const bucket = map.get(key) || [];
    bucket.push(item);
    map.set(key, bucket);
    return map;
  }, new Map());
}

async function emitNotification(io, notification) {
  if (!io || !notification?.user_id) {
    return;
  }

  io.to(`user:${notification.user_id}`).emit('new_notification', {
    notification
  });
}

async function remindExpenseDebts(options = {}) {
  const now = options.now ? new Date(options.now) : new Date();
  const io = options.io || null;
  const dayKey = formatDate(startOfUtcDay(now));

  const [memberships, expenses, settlements] = await Promise.all([
    prisma.groupMember.findMany({
      where: {
        status: 'active'
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            status: true
          }
        },
        user: {
          select: {
            display_name: true
          }
        }
      }
    }),
    prisma.expense.findMany({
      include: {
        splits: true
      }
    }),
    prisma.settlement.findMany()
  ]);

  const activeMemberships = memberships.filter((membership) => membership.group?.status === 'active');
  const memberGroups = groupBy(activeMemberships, (membership) => membership.group_id);
  const expensesByGroup = groupBy(expenses, (expense) => expense.group_id);
  const settlementsByGroup = groupBy(settlements, (settlement) => settlement.group_id);
  const notifications = [];

  for (const [groupId, groupMemberships] of memberGroups.entries()) {
    const balanceMap = calculateBalanceMap(
      expensesByGroup.get(groupId) || [],
      settlementsByGroup.get(groupId) || []
    );

    for (const membership of groupMemberships) {
      const balance = roundMoney(balanceMap.get(membership.user_id) || 0);

      if (balance >= -DEBT_THRESHOLD) {
        continue;
      }

      const title = 'Nhắc nhở trả nợ';
      const body = buildExpenseReminderBody(membership.group.name, Math.abs(balance), dayKey);
      const notification = await createNotificationIfMissing(
        prisma,
        {
          user_id: membership.user_id,
          group_id: groupId,
          type: 'settlement_suggested',
          title,
          body
        },
        {
          user_id: membership.user_id,
          group_id: groupId,
          type: 'settlement_suggested',
          title,
          body
        }
      );

      if (notification && notification.created_at) {
        notifications.push(notification);
        await emitNotification(io, notification);
      }
    }
  }

  return {
    created_count: notifications.length
  };
}

async function remindFundContributions(options = {}) {
  const now = options.now ? new Date(options.now) : new Date();
  const io = options.io || null;
  const today = startOfUtcDay(now);
  const campaigns = await prisma.fundCampaign.findMany({
    where: {
      status: 'active'
    },
    include: {
      group: {
        select: {
          id: true,
          name: true
        }
      },
      contributions: {
        where: {
          status: {
            in: ['pending', 'late']
          }
        },
        include: {
          user: {
            select: {
              display_name: true
            }
          }
        }
      }
    }
  });

  const notifications = [];
  let markedLateCount = 0;

  for (const campaign of campaigns) {
    const dueDate = startOfUtcDay(new Date(campaign.due_date));
    const daysUntilDue = Math.round((dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
    const inReminderWindow = [3, 1, 0, -1, -2, -3].includes(daysUntilDue);

    if (!inReminderWindow) {
      continue;
    }

    const windowKey = `${formatDate(today)}:${daysUntilDue}`;

    for (const contribution of campaign.contributions) {
      const title = daysUntilDue < 0 ? 'Thông báo trễ hạn đóng quỹ' : 'Nhắc đóng quỹ';
      const body = buildFundReminderBody(campaign.title, daysUntilDue, windowKey);
      const notificationType = daysUntilDue < 0 || contribution.status === 'late' ? 'fund_late' : 'fund_reminder';
      const notification = await createNotificationIfMissing(
        prisma,
        {
          user_id: contribution.user_id,
          group_id: campaign.group_id,
          type: notificationType,
          title,
          body
        },
        {
          user_id: contribution.user_id,
          group_id: campaign.group_id,
          type: notificationType,
          title,
          body
        }
      );

      if (notification && notification.created_at) {
        notifications.push(notification);
        await emitNotification(io, notification);
      }

      if (daysUntilDue === 0 && contribution.status === 'pending' && prisma.fundContribution?.update) {
        await prisma.fundContribution.update({
          where: {
            id: contribution.id
          },
          data: {
            status: 'late'
          }
        });
        markedLateCount += 1;
      }
    }
  }

  return {
    created_count: notifications.length,
    marked_late_count: markedLateCount
  };
}

function scheduleCronJobs(io) {
  const scheduledJobs = [];

  scheduledJobs.push(
    cron.schedule('0 1 * * *', async () => {
      await remindExpenseDebts({ io });
      await remindFundContributions({ io });
    }, {
      timezone: DEFAULT_TIMEZONE
    })
  );

  return scheduledJobs;
}

module.exports = {
  remindExpenseDebts,
  remindFundContributions,
  scheduleCronJobs
};
