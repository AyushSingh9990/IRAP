export const SITE_SETTING_GROUPS = Object.freeze({
  GENERAL: 'general',
  CONTACT: 'contact',
  SOCIAL: 'social',
  SEO: 'seo',
  HOMEPAGE: 'homepage',
  FOOTER: 'footer',
  RENEWAL: 'renewal',
  PAYMENT: 'payment',
});

export const SITE_SETTING_GROUP_VALUES = Object.freeze(
  Object.values(SITE_SETTING_GROUPS),
);

export const CONTENT_PAGE_STATUSES = Object.freeze({
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
});

export const CONTENT_PAGE_STATUS_VALUES = Object.freeze(
  Object.values(CONTENT_PAGE_STATUSES),
);

export const TEMPLATE_STATUSES = Object.freeze({
  ACTIVE: 'active',
  INACTIVE: 'inactive',
});

export const TEMPLATE_STATUS_VALUES = Object.freeze(
  Object.values(TEMPLATE_STATUSES),
);

export const SUPPORT_CATEGORIES = Object.freeze({
  GENERAL: 'general',
  MEMBERSHIP: 'membership',
  TRAINING_PROVIDER: 'training_provider',
  ORGANIZATION: 'organization',
  TECHNICAL_SUPPORT: 'technical_support',
  ACCESSIBILITY: 'accessibility',
  COMPLAINT: 'complaint',
});

export const SUPPORT_CATEGORY_VALUES = Object.freeze(
  Object.values(SUPPORT_CATEGORIES),
);

export const SUPPORT_STATUSES = Object.freeze({
  NEW: 'new',
  OPEN: 'open',
  WAITING_FOR_SUBMITTER: 'waiting_for_submitter',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
});

export const SUPPORT_STATUS_VALUES = Object.freeze(
  Object.values(SUPPORT_STATUSES),
);

export const COMPLAINT_PRIORITIES = Object.freeze({
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
});

export const COMPLAINT_PRIORITY_VALUES = Object.freeze(
  Object.values(COMPLAINT_PRIORITIES),
);

export const USER_ACCOUNT_STATUS_VALUES = Object.freeze([
  'pending_verification',
  'active',
  'locked',
  'suspended',
  'disabled',
]);
