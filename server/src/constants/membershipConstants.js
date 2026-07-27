import { APPLICATION_TYPES } from './applicationTypes.js';

export const MEMBERSHIP_STATUSES = Object.freeze({
  ACTIVE: 'active',
  RENEWAL_DUE: 'renewal_due',
  GRACE_PERIOD: 'grace_period',
  EXPIRED: 'expired',
  SUSPENDED: 'suspended',
  REVOKED: 'revoked',
});

export const MEMBERSHIP_STATUS_VALUES = Object.freeze(
  Object.values(MEMBERSHIP_STATUSES),
);

export const MEMBERSHIP_PAYMENT_STATUSES = Object.freeze({
  NOT_REQUIRED: 'not_required',
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  WAIVED: 'waived',
  REFUNDED: 'refunded',
});

export const MEMBERSHIP_PAYMENT_STATUS_VALUES = Object.freeze(
  Object.values(MEMBERSHIP_PAYMENT_STATUSES),
);

export const CERTIFICATE_STATUSES = Object.freeze({
  ACTIVE: 'active',
  EXPIRED: 'expired',
  SUSPENDED: 'suspended',
  REVOKED: 'revoked',
  REPLACED: 'replaced',
});

export const CERTIFICATE_STATUS_VALUES = Object.freeze(
  Object.values(CERTIFICATE_STATUSES),
);

export const CERTIFICATE_TITLES = Object.freeze({
  [APPLICATION_TYPES.MEMBER]: 'Professional Membership Certificate',
  [APPLICATION_TYPES.TRAINING_PROVIDER]: 'Training Provider Accreditation Certificate',
  [APPLICATION_TYPES.ORGANIZATION]: 'Organization Accreditation Certificate',
});

export const MEMBERSHIP_TYPE_LABELS = Object.freeze({
  [APPLICATION_TYPES.MEMBER]: 'Professional Member',
  [APPLICATION_TYPES.TRAINING_PROVIDER]: 'Training Provider',
  [APPLICATION_TYPES.ORGANIZATION]: 'Accredited Organization',
});

export const DEFAULT_REGISTRATION_PREFIXES = Object.freeze({
  [APPLICATION_TYPES.MEMBER]: 'MEM',
  [APPLICATION_TYPES.TRAINING_PROVIDER]: 'TPR',
  [APPLICATION_TYPES.ORGANIZATION]: 'ORG',
});

export const MEMBERSHIP_ADMIN_ACTIONS = Object.freeze({
  SUSPEND: 'suspend',
  REINSTATE: 'reinstate',
  REVOKE: 'revoke',
});

export const MEMBERSHIP_ADMIN_ACTION_VALUES = Object.freeze(
  Object.values(MEMBERSHIP_ADMIN_ACTIONS),
);

export const CERTIFICATE_ADMIN_ACTIONS = Object.freeze({
  REVOKE: 'revoke',
  REPLACE: 'replace',
});

export const CERTIFICATE_ADMIN_ACTION_VALUES = Object.freeze(
  Object.values(CERTIFICATE_ADMIN_ACTIONS),
);
