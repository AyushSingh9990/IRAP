export const REVIEW_CASE_STATUSES = Object.freeze({
  OPEN: 'open',
  AWAITING_INFORMATION: 'awaiting_information',
  COMPLETED: 'completed',
  SUSPENDED: 'suspended',
});

export const REVIEW_CASE_STATUS_VALUES = Object.freeze(
  Object.values(REVIEW_CASE_STATUSES),
);

export const REVIEW_NOTE_VISIBILITIES = Object.freeze({
  INTERNAL: 'internal',
  APPLICANT: 'applicant',
});

export const REVIEW_NOTE_VISIBILITY_VALUES = Object.freeze(
  Object.values(REVIEW_NOTE_VISIBILITIES),
);

export const REVIEW_DECISIONS = Object.freeze({
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
});

export const REVIEW_DECISION_VALUES = Object.freeze(
  Object.values(REVIEW_DECISIONS),
);

export const REVIEW_CHECKLIST_KEYS = Object.freeze([
  'requiredDocumentsReviewed',
  'requiredStandardsMet',
  'identityDeclarationsChecked',
  'registrationDataChecked',
  'membershipDatesChecked',
  'certificateDataChecked',
]);

export const REVIEW_QUEUE_ASSIGNMENTS = Object.freeze({
  ALL: 'all',
  MINE: 'mine',
  UNASSIGNED: 'unassigned',
});

export const REVIEW_QUEUE_ASSIGNMENT_VALUES = Object.freeze(
  Object.values(REVIEW_QUEUE_ASSIGNMENTS),
);
