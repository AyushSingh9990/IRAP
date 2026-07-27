export const ARTICLE_STATUSES = Object.freeze({
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  CHANGES_REQUESTED: 'changes_requested',
  APPROVED: 'approved',
  PUBLISHED: 'published',
  REJECTED: 'rejected',
  ARCHIVED: 'archived',
});

export const ARTICLE_STATUS_VALUES = Object.freeze(
  Object.values(ARTICLE_STATUSES),
);

export const ARTICLE_EDITABLE_STATUSES = Object.freeze([
  ARTICLE_STATUSES.DRAFT,
  ARTICLE_STATUSES.CHANGES_REQUESTED,
]);

export const ARTICLE_AUTHOR_TYPES = Object.freeze({
  TRAINING_PROVIDER: 'training_provider',
  ORGANIZATION: 'organization',
});

export const ARTICLE_AUTHOR_TYPE_VALUES = Object.freeze(
  Object.values(ARTICLE_AUTHOR_TYPES),
);

export const ARTICLE_TAXONOMY_STATUSES = Object.freeze({
  ACTIVE: 'active',
  ARCHIVED: 'archived',
});

export const ARTICLE_TAXONOMY_STATUS_VALUES = Object.freeze(
  Object.values(ARTICLE_TAXONOMY_STATUSES),
);

export const ARTICLE_ADMIN_ACTIONS = Object.freeze({
  REQUEST_CHANGES: 'request_changes',
  APPROVE: 'approve',
  PUBLISH: 'publish',
  REJECT: 'reject',
  ARCHIVE: 'archive',
  RESTORE: 'restore',
});

export const ARTICLE_ADMIN_ACTION_VALUES = Object.freeze(
  Object.values(ARTICLE_ADMIN_ACTIONS),
);
