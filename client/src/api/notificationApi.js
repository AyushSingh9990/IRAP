import axiosInstance from './axiosInstance.js';

export async function listNotifications(params = {}) {
  const response = await axiosInstance.get('/notifications', { params });
  return response.data;
}

export async function getNotificationSummary() {
  const response = await axiosInstance.get('/notifications/summary');
  return response.data;
}

export async function markNotificationRead(notificationId) {
  const response = await axiosInstance.patch(`/notifications/${notificationId}/read`);
  return response.data;
}

export async function markAllNotificationsRead() {
  const response = await axiosInstance.patch('/notifications/read-all');
  return response.data;
}

export async function getNotificationPreferences() {
  const response = await axiosInstance.get('/notifications/preferences/current');
  return response.data;
}

export async function updateNotificationPreferences(payload) {
  const response = await axiosInstance.patch(
    '/notifications/preferences/current',
    payload,
  );
  return response.data;
}
