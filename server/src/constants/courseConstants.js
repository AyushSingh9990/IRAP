export const COURSE_STATUSES = Object.freeze({
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  INFORMATION_REQUIRED: 'information_required',
  RESUBMITTED: 'resubmitted',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
  REVOKED: 'revoked',
  EXPIRED: 'expired',
});

export const COURSE_STATUS_VALUES = Object.freeze(
  Object.values(COURSE_STATUSES),
);

export const EDITABLE_COURSE_STATUSES = Object.freeze([
  COURSE_STATUSES.DRAFT,
  COURSE_STATUSES.INFORMATION_REQUIRED,
]);

export const SUBMITTABLE_COURSE_STATUSES = Object.freeze([
  COURSE_STATUSES.DRAFT,
  COURSE_STATUSES.INFORMATION_REQUIRED,
]);

export const COURSE_DELIVERY_METHODS = Object.freeze({
  ONLINE: 'online',
  IN_PERSON: 'in_person',
  HYBRID: 'hybrid',
});

export const COURSE_DELIVERY_METHOD_VALUES = Object.freeze(
  Object.values(COURSE_DELIVERY_METHODS),
);

export const COURSE_CREDIT_UNITS = Object.freeze({
  CPD: 'CPD',
  CEU: 'CEU',
});

export const COURSE_CREDIT_UNIT_VALUES = Object.freeze(
  Object.values(COURSE_CREDIT_UNITS),
);

export const COURSE_DOCUMENT_CATEGORIES = Object.freeze({
  CURRICULUM: 'curriculum',
  ASSESSMENT: 'assessment',
  FACULTY: 'faculty',
  QUALITY_ASSURANCE: 'quality_assurance',
  LEARNER_INFORMATION: 'learner_information',
  OTHER: 'other',
});

export const COURSE_DOCUMENT_CATEGORY_VALUES = Object.freeze(
  Object.values(COURSE_DOCUMENT_CATEGORIES),
);

export const COURSE_DOCUMENT_CATEGORY_LABELS = Object.freeze({
  [COURSE_DOCUMENT_CATEGORIES.CURRICULUM]: 'Curriculum',
  [COURSE_DOCUMENT_CATEGORIES.ASSESSMENT]: 'Assessment plan',
  [COURSE_DOCUMENT_CATEGORIES.FACULTY]: 'Faculty evidence',
  [COURSE_DOCUMENT_CATEGORIES.QUALITY_ASSURANCE]: 'Quality assurance',
  [COURSE_DOCUMENT_CATEGORIES.LEARNER_INFORMATION]: 'Learner information',
  [COURSE_DOCUMENT_CATEGORIES.OTHER]: 'Other evidence',
});

export const COURSE_REVIEW_STATUSES = Object.freeze({
  OPEN: 'open',
  AWAITING_INFORMATION: 'awaiting_information',
  COMPLETED: 'completed',
});

export const COURSE_REVIEW_STATUS_VALUES = Object.freeze(
  Object.values(COURSE_REVIEW_STATUSES),
);

export const COURSE_REVIEW_NOTE_VISIBILITIES = Object.freeze({
  INTERNAL: 'internal',
  PROVIDER: 'provider',
});

export const COURSE_REVIEW_NOTE_VISIBILITY_VALUES = Object.freeze(
  Object.values(COURSE_REVIEW_NOTE_VISIBILITIES),
);

export const COURSE_REVIEW_CHECKLIST_KEYS = Object.freeze([
  'curriculumReviewed',
  'learningOutcomesReviewed',
  'assessmentReviewed',
  'facultyReviewed',
  'qualityAssuranceReviewed',
  'creditHoursVerified',
  'publicDataChecked',
]);

export const COURSE_CERTIFICATE_STATUSES = Object.freeze({
  ACTIVE: 'active',
  EXPIRED: 'expired',
  SUSPENDED: 'suspended',
  REVOKED: 'revoked',
  REPLACED: 'replaced',
});

export const COURSE_CERTIFICATE_STATUS_VALUES = Object.freeze(
  Object.values(COURSE_CERTIFICATE_STATUSES),
);

export const COURSE_ADMIN_ACTIONS = Object.freeze({
  SUSPEND: 'suspend',
  REINSTATE: 'reinstate',
  REVOKE: 'revoke',
});

export const COURSE_ADMIN_ACTION_VALUES = Object.freeze(
  Object.values(COURSE_ADMIN_ACTIONS),
);
