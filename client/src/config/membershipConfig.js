export const membershipStatusLabels = Object.freeze({
  active: 'Active',
  renewal_due: 'Renewal due',
  grace_period: 'Grace period',
  expired: 'Expired',
  suspended: 'Suspended',
  revoked: 'Revoked',
});

export const membershipStatusTones = Object.freeze({
  active: 'success',
  renewal_due: 'warning',
  grace_period: 'warning',
  expired: 'error',
  suspended: 'error',
  revoked: 'error',
});

export const certificateStatusLabels = Object.freeze({
  active: 'Active',
  expired: 'Expired',
  suspended: 'Suspended',
  revoked: 'Revoked',
  replaced: 'Replaced',
});

export const certificateStatusTones = Object.freeze({
  active: 'success',
  expired: 'warning',
  suspended: 'error',
  revoked: 'error',
  replaced: 'neutral',
});

export function formatRegistryDate(value) {
  if (!value) return 'Not available';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value));
}
