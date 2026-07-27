export const articleStatusLabels = Object.freeze({
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under review',
  changes_requested: 'Changes requested',
  approved: 'Approved',
  published: 'Published',
  rejected: 'Rejected',
  archived: 'Archived',
});

export const articleStatusTones = Object.freeze({
  draft: 'neutral',
  submitted: 'info',
  under_review: 'info',
  changes_requested: 'warning',
  approved: 'success',
  published: 'success',
  rejected: 'error',
  archived: 'neutral',
});

export const articleAuthorTypeLabels = Object.freeze({
  training_provider: 'Training provider',
  organization: 'Accredited organization',
});

export const editableArticleStatuses = Object.freeze([
  'draft',
  'changes_requested',
]);

export function formatArticleDate(value) {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}
