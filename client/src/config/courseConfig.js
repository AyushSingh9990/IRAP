export const courseStatusLabels = Object.freeze({
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under review',
  information_required: 'Information required',
  resubmitted: 'Resubmitted',
  approved: 'Approved',
  rejected: 'Rejected',
  suspended: 'Suspended',
  revoked: 'Revoked',
  expired: 'Expired',
});

export const courseStatusTones = Object.freeze({
  draft: 'neutral',
  submitted: 'info',
  under_review: 'info',
  information_required: 'warning',
  resubmitted: 'info',
  approved: 'success',
  rejected: 'error',
  suspended: 'warning',
  revoked: 'error',
  expired: 'neutral',
});

export const editableCourseStatuses = new Set([
  'draft',
  'information_required',
]);

export const courseDocumentCategories = Object.freeze([
  { value: 'curriculum', label: 'Curriculum' },
  { value: 'assessment', label: 'Assessment plan' },
  { value: 'faculty', label: 'Faculty evidence' },
  { value: 'quality_assurance', label: 'Quality assurance' },
  { value: 'learner_information', label: 'Learner information' },
  { value: 'other', label: 'Other evidence' },
]);

export const courseDocumentStatusLabels = Object.freeze({
  pending: 'Pending review',
  approved: 'Approved',
  rejected: 'Rejected',
  replacement_requested: 'Replacement requested',
  superseded: 'Superseded',
});

export const courseDocumentStatusTones = Object.freeze({
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
  replacement_requested: 'warning',
  superseded: 'neutral',
});

export const courseChecklistLabels = Object.freeze({
  curriculumReviewed: 'Curriculum reviewed',
  learningOutcomesReviewed: 'Learning outcomes reviewed',
  assessmentReviewed: 'Assessment reviewed',
  facultyReviewed: 'Faculty evidence reviewed',
  qualityAssuranceReviewed: 'Quality assurance reviewed',
  creditHoursVerified: 'CPD or CEU hours verified',
  publicDataChecked: 'Public directory data checked',
});

export function splitCourseList(value) {
  return String(value || '')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function joinCourseList(values) {
  return Array.isArray(values) ? values.join('\n') : '';
}

export function formatCourseMoney(amountMinor, currency = 'INR') {
  if (!Number.isInteger(amountMinor)) return 'Not listed';

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
  }).format(amountMinor / 100);
}

export function formatCourseDate(value) {
  if (!value) return 'Not available';

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value));
}
