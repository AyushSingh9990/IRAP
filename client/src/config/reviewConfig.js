export const applicationTypeLabels = Object.freeze({
  member: 'Professional Member',
  training_provider: 'Training Provider',
  organization: 'Accredited Organization',
});

export const reviewCaseStatusLabels = Object.freeze({
  open: 'Open',
  awaiting_information: 'Awaiting information',
  completed: 'Completed',
  suspended: 'Suspended',
});

export const reviewCaseStatusTones = Object.freeze({
  open: 'info',
  awaiting_information: 'warning',
  completed: 'success',
  suspended: 'error',
});

export const reviewChecklistDefinitions = Object.freeze([
  {
    key: 'requiredDocumentsReviewed',
    label: 'Required documents reviewed',
    description: 'Every current supporting document has received a review decision.',
  },
  {
    key: 'requiredStandardsMet',
    label: 'Required standards met',
    description: 'The submitted evidence satisfies the applicable professional or accreditation standards.',
  },
  {
    key: 'identityDeclarationsChecked',
    label: 'Identity and declarations checked',
    description: 'Identity, ethics, consent, and declaration answers have been reviewed.',
  },
  {
    key: 'registrationDataChecked',
    label: 'Registration data checked',
    description: 'The data needed for the current release registration-number issuance has been verified.',
  },
  {
    key: 'membershipDatesChecked',
    label: 'Validity-date data checked',
    description: 'The information required to calculate membership or accreditation dates is complete.',
  },
  {
    key: 'certificateDataChecked',
    label: 'Certificate data checked',
    description: 'The approved display name and certificate data have been checked before issuance.',
  },
]);

export const auditActionLabels = Object.freeze({
  'reviewer.assigned': 'Reviewer assigned',
  'reviewer.reassigned': 'Reviewer reassigned',
  'reviewer.unassigned': 'Reviewer unassigned',
  'review.checklist_updated': 'Review checklist updated',
  'review.note_internal_added': 'Internal note added',
  'review.note_applicant_added': 'Applicant note added',
  'review.payment_waived': 'Payment waived',
  'review.payment_waiver_removed': 'Payment waiver removed',
  'application.information_requested': 'Information requested',
  'application.approved': 'Application approved',
  'application.rejected': 'Application rejected',
  'application.suspended': 'Application suspended',
  'application.resubmitted': 'Application resubmitted',
  'membership.policy_updated': 'Membership policy updated',
  'membership.issued': 'Membership issued',
  'membership.renewed': 'Membership renewed',
  'membership.suspended': 'Membership suspended',
  'membership.reinstated': 'Membership reinstated',
  'membership.revoked': 'Membership revoked',
  'certificate.revoked': 'Certificate revoked',
  'certificate.replaced': 'Certificate replaced',
});

export const auditOutcomeTones = Object.freeze({
  pending: 'warning',
  success: 'success',
  failed: 'error',
});

export function formatSubmittedAnswer(value) {
  if (value === null || value === undefined || value === '') return 'Not supplied';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.length ? value.join(', ') : 'Not supplied';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

export function humanizeFieldName(value) {
  return String(value)
    .replaceAll('_', ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (character) => character.toUpperCase());
}
