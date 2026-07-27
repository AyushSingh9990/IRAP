export const NOTIFICATION_TYPES = Object.freeze({
  APPLICATION_SUBMITTED: 'application_submitted',
  APPLICATION_UPDATE: 'application_update',
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAILURE: 'payment_failure',
  PAYMENT_PENDING: 'payment_pending',
  DOCUMENT_UPDATE: 'document_update',
  SECURITY: 'security',
  ANNOUNCEMENT: 'announcement',
  GENERAL: 'general',
  COURSE: 'course',
  CERTIFICATE_ISSUED: 'certificate_issued',
  CERTIFICATE_REVOKED: 'certificate_revoked',
  CERTIFICATE_REPLACED: 'certificate_replaced',
  MEMBERSHIP_RENEWED: 'membership_renewed',
  MEMBERSHIP_STATUS_CHANGED: 'membership_status_changed',
  RENEWAL_STARTED: 'renewal_started',
  RENEWAL_REMINDER: 'renewal_reminder',
  COURSE_SUBMITTED: 'course_submitted',
  COURSE_INFORMATION_REQUIRED: 'course_information_required',
  COURSE_APPROVED: 'course_approved',
  COURSE_REJECTED: 'course_rejected',
  COURSE_STATUS_CHANGED: 'course_status_changed',
  COURSE_DOCUMENT_UPDATED: 'course_document_updated',
  ARTICLE_SUBMITTED: 'article_submitted',
  ARTICLE_CHANGES_REQUESTED: 'article_changes_requested',
  ARTICLE_APPROVED: 'article_approved',
  ARTICLE_PUBLISHED: 'article_published',
  ARTICLE_REJECTED: 'article_rejected',
  ARTICLE_ARCHIVED: 'article_archived',
});

export const NOTIFICATION_TYPE_VALUES = Object.freeze(
  Object.values(NOTIFICATION_TYPES),
);

export const NOTIFICATION_CATEGORIES = Object.freeze({
  APPLICATION: 'application',
  PAYMENT: 'payment',
  DOCUMENT: 'document',
  MEMBERSHIP: 'membership',
  COURSE: 'course',
  SECURITY: 'security',
  ANNOUNCEMENT: 'announcement',
  GENERAL: 'general',
  ARTICLE: 'article',
});

export const NOTIFICATION_CATEGORY_VALUES = Object.freeze(
  Object.values(NOTIFICATION_CATEGORIES),
);

export const NOTIFICATION_EMAIL_STATUSES = Object.freeze({
  NOT_REQUESTED: 'not_requested',
  PENDING: 'pending',
  SENT: 'sent',
  FAILED: 'failed',
});

export const NOTIFICATION_EMAIL_STATUS_VALUES = Object.freeze(
  Object.values(NOTIFICATION_EMAIL_STATUSES),
);
