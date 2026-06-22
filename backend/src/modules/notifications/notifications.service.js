const prisma = require('../../config/prisma');
const { AppError } = require('../../utils/appError');

function buildNotificationResponse(notification) {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    is_read: notification.is_read,
    group_id: notification.group_id || null,
    group_name: notification.group?.name || null,
    created_at: notification.created_at
  };
}

async function listNotifications(userId, query) {
  const where = {
    user_id: userId,
    ...(query.unread_only ? { is_read: false } : {})
  };
  const skip = (query.page - 1) * query.limit;

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: {
        created_at: 'desc'
      },
      skip,
      take: query.limit,
      include: {
        group: {
          select: {
            name: true
          }
        }
      }
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({
      where: {
        user_id: userId,
        is_read: false
      }
    })
  ]);

  return {
    data: notifications.map(buildNotificationResponse),
    meta: {
      unread_count: unreadCount,
      page: query.page,
      total,
      has_more: skip + notifications.length < total
    }
  };
}

async function markNotificationRead(userId, notificationId) {
  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      user_id: userId
    }
  });

  if (!notification) {
    throw new AppError({
      statusCode: 404,
      code: 'NOTIFICATION_NOT_FOUND',
      message: 'Thông báo không tồn tại'
    });
  }

  const updated = await prisma.notification.update({
    where: {
      id: notificationId
    },
    data: {
      is_read: true
    }
  });

  return {
    id: updated.id,
    is_read: updated.is_read
  };
}

async function markAllNotificationsRead(userId) {
  const result = await prisma.notification.updateMany({
    where: {
      user_id: userId,
      is_read: false
    },
    data: {
      is_read: true
    }
  });

  return {
    updated_count: result.count
  };
}

module.exports = {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead
};
