const express = require('express');

const { authMiddleware } = require('../../middlewares/auth');
const { validate } = require('../../middlewares/validate');
const notificationsController = require('./notifications.controller');
const { listNotificationsQuerySchema } = require('./notifications.schema');

const router = express.Router();

router.get(
  '/',
  authMiddleware,
  validate(listNotificationsQuerySchema, 'query'),
  notificationsController.listNotifications
);
router.patch(
  '/read-all',
  authMiddleware,
  notificationsController.markAllNotificationsRead
);
router.patch(
  '/:notificationId/read',
  authMiddleware,
  notificationsController.markNotificationRead
);

module.exports = router;
