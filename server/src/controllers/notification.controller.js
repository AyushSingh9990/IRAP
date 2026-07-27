import {
  getNotificationPreferences,
  getNotificationSummary,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  updateNotificationPreferences,
} from '../services/notification.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getNotifications = asyncHandler(async (request, response) => {
  const result = await listNotifications({
    userId: request.auth.userId,
    filters: request.validated.query,
  });
  response.status(200).json(
    new ApiResponse({
      message: 'Notifications loaded.',
      data: { notifications: result.notifications },
      meta: result.meta,
    }),
  );
});

export const getSummary = asyncHandler(async (request, response) => {
  const summary = await getNotificationSummary(request.auth.userId);
  response.status(200).json(
    new ApiResponse({ message: 'Notification summary loaded.', data: { summary } }),
  );
});

export const readNotification = asyncHandler(async (request, response) => {
  const notification = await markNotificationRead({
    userId: request.auth.userId,
    notificationId: request.validated.params.notificationId,
  });
  response.status(200).json(
    new ApiResponse({ message: 'Notification marked as read.', data: { notification } }),
  );
});

export const readAllNotifications = asyncHandler(async (request, response) => {
  const result = await markAllNotificationsRead(request.auth.userId);
  response.status(200).json(
    new ApiResponse({ message: 'All notifications marked as read.', data: result }),
  );
});

export const getPreferences = asyncHandler(async (request, response) => {
  const preferences = await getNotificationPreferences(request.auth.userId);
  response.status(200).json(
    new ApiResponse({ message: 'Notification preferences loaded.', data: { preferences } }),
  );
});

export const updatePreferences = asyncHandler(async (request, response) => {
  const preferences = await updateNotificationPreferences({
    userId: request.auth.userId,
    input: request.validated.body,
  });
  response.status(200).json(
    new ApiResponse({ message: 'Notification preferences updated.', data: { preferences } }),
  );
});
