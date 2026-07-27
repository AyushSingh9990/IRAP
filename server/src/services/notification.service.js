import { logger } from '../config/logger.js';
import Notification from '../models/Notification.js';
import NotificationPreference from '../models/NotificationPreference.js';
import { ApiError } from '../utils/ApiError.js';

const DEFAULT_PREFERENCES = Object.freeze({
  inAppEnabled: true,
  emailEnabled: true,
  applicationUpdates: true,
  paymentUpdates: true,
  documentUpdates: true,
  securityAlerts: true,
  announcements: true,
});

function categoryPreferenceKey(category) {
  return {
    application: 'applicationUpdates',
    payment: 'paymentUpdates',
    document: 'documentUpdates',
    security: 'securityAlerts',
    announcement: 'announcements',
    general: 'inAppEnabled',
    membership: 'applicationUpdates',
    course: 'applicationUpdates',
    article: 'applicationUpdates',
  }[category] || 'inAppEnabled';
}

export async function getNotificationPreferences(userId) {
  const preference = await NotificationPreference.findOne({ user: userId }).lean();
  if (!preference) return { user: String(userId), ...DEFAULT_PREFERENCES };
  return {
    user: preference.user.toString(),
    inAppEnabled: preference.inAppEnabled,
    emailEnabled: preference.emailEnabled,
    applicationUpdates: preference.applicationUpdates,
    paymentUpdates: preference.paymentUpdates,
    documentUpdates: preference.documentUpdates,
    securityAlerts: preference.securityAlerts,
    announcements: preference.announcements,
  };
}

export async function updateNotificationPreferences({ userId, input }) {
  const preference = await NotificationPreference.findOneAndUpdate(
    { user: userId },
    { $set: { ...input, securityAlerts: true }, $setOnInsert: { user: userId } },
    { new: true, upsert: true, runValidators: true },
  );
  return preference.toJSON();
}

export async function createNotification({
  recipient,
  type,
  category,
  title,
  message,
  actionUrl = '',
  application = null,
  payment = null,
  document = null,
  membership = null,
  certificate = null,
  reference = '',
  dedupeKey = '',
  createdBy = null,
}) {
  const preferences = await getNotificationPreferences(recipient);
  const preferenceKey = categoryPreferenceKey(category);
  const isRequiredSecurityAlert = category === 'security';
  if (
    !isRequiredSecurityAlert &&
    (!preferences.inAppEnabled || preferences[preferenceKey] === false)
  ) {
    return null;
  }

  const payload = {
    recipient,
    type,
    category,
    title,
    message,
    actionUrl,
    application,
    payment,
    document,
    membership,
    certificate,
    reference,
    dedupeKey: dedupeKey || null,
    createdBy,
  };

  if (dedupeKey) {
    return Notification.findOneAndUpdate(
      { recipient, dedupeKey },
      { $setOnInsert: payload },
      { new: true, upsert: true, runValidators: true },
    );
  }

  return Notification.create(payload);
}

export async function listNotifications({ userId, filters }) {
  const query = { recipient: userId, archivedAt: null };
  if (filters.status === 'read') query.readAt = { $ne: null };
  if (filters.status === 'unread') query.readAt = null;
  if (filters.category) query.category = filters.category;

  const skip = (filters.page - 1) * filters.limit;
  const [items, total, unreadCount] = await Promise.all([
    Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(filters.limit),
    Notification.countDocuments(query),
    Notification.countDocuments({ recipient: userId, archivedAt: null, readAt: null }),
  ]);

  return {
    notifications: items.map((item) => item.toJSON()),
    meta: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / filters.limit)),
      unreadCount,
    },
  };
}

export async function getNotificationSummary(userId) {
  const [unreadCount, latest] = await Promise.all([
    Notification.countDocuments({ recipient: userId, archivedAt: null, readAt: null }),
    Notification.find({ recipient: userId, archivedAt: null })
      .sort({ createdAt: -1 })
      .limit(5),
  ]);
  return { unreadCount, latest: latest.map((item) => item.toJSON()) };
}

export async function markNotificationRead({ userId, notificationId }) {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, recipient: userId, archivedAt: null },
    { $set: { readAt: new Date() } },
    { new: true },
  );
  if (!notification) throw new ApiError(404, 'Notification not found.');
  return notification.toJSON();
}

export async function markAllNotificationsRead(userId) {
  const result = await Notification.updateMany(
    { recipient: userId, archivedAt: null, readAt: null },
    { $set: { readAt: new Date() } },
  );
  return { updatedCount: result.modifiedCount };
}


export async function createNotificationSafely(input) {
  try {
    return await createNotification(input);
  } catch (error) {
    logger.error(
      {
        error,
        recipient: String(input.recipient || ''),
        type: input.type,
        category: input.category,
      },
      'Notification creation failed',
    );
    return null;
  }
}
