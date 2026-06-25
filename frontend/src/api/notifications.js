import { apiClient } from './axios';

export async function listNotifications(params = {}) {
  const response = await apiClient.get('/notifications', {
    params,
  });

  return {
    data: response.data?.data ?? [],
    meta: response.data?.meta ?? null,
  };
}

export async function markNotificationRead(notificationId) {
  const response = await apiClient.patch(`/notifications/${notificationId}/read`);

  return response.data?.data;
}

export async function markAllNotificationsRead() {
  const response = await apiClient.patch('/notifications/read-all');

  return response.data?.data;
}
