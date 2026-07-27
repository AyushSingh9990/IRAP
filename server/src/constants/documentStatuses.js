export const DOCUMENT_REVIEW_STATUSES = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  REPLACEMENT_REQUESTED: 'replacement_requested',
  SUPERSEDED: 'superseded',
});

export const DOCUMENT_REVIEW_STATUS_VALUES = Object.freeze(
  Object.values(DOCUMENT_REVIEW_STATUSES),
);

export const DOCUMENT_REVIEW_ACTIONS = Object.freeze({
  APPROVE: 'approve',
  REJECT: 'reject',
  REQUEST_REPLACEMENT: 'request_replacement',
});

export const DOCUMENT_REVIEW_ACTION_VALUES = Object.freeze(
  Object.values(DOCUMENT_REVIEW_ACTIONS),
);
