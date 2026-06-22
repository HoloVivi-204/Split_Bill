async function createNotification(tx, data) {
  if (!tx.notification?.create) {
    return null;
  }

  return tx.notification.create({
    data
  });
}

async function createNotificationIfMissing(tx, where, data) {
  if (!tx.notification?.findFirst || !tx.notification?.create) {
    return null;
  }

  const existing = await tx.notification.findFirst({
    where
  });

  if (existing) {
    return null;
  }

  return createNotification(tx, data);
}

function serializeNotification(notification) {
  if (!notification) {
    return null;
  }

  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    is_read: notification.is_read,
    group_id: notification.group_id,
    created_at: notification.created_at
  };
}

function emitNotifications(io, notifications) {
  if (!io?.to || !Array.isArray(notifications) || notifications.length === 0) {
    return;
  }

  notifications.filter(Boolean).forEach((notification) => {
    io.to(`user:${notification.user_id}`).emit("new_notification", serializeNotification(notification));
  });
}

module.exports = {
  createNotification,
  createNotificationIfMissing,
  emitNotifications,
  serializeNotification
};
