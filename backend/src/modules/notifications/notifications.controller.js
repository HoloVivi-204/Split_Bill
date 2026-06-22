const { buildSuccessResponse } = require('../../utils/apiResponse');
const notificationsService = require('./notifications.service');

async function listNotifications(request, response, next) {
  try {
    const result = await notificationsService.listNotifications(request.user.id, request.query);
    response.status(200).json(buildSuccessResponse(result.data, result.meta));
  } catch (error) {
    next(error);
  }
}

async function markNotificationRead(request, response, next) {
  try {
    const data = await notificationsService.markNotificationRead(
      request.user.id,
      request.params.notificationId
    );
    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function markAllNotificationsRead(request, response, next) {
  try {
    const data = await notificationsService.markAllNotificationsRead(request.user.id);
    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead
};
