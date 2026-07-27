export const PAYMENT_PROVIDERS = Object.freeze({
  RAZORPAY: 'razorpay',
  STRIPE: 'stripe',
  OFFLINE: 'offline',
});

export const PAYMENT_PROVIDER_VALUES = Object.freeze(
  Object.values(PAYMENT_PROVIDERS),
);

export const PAYMENT_STATUSES = Object.freeze({
  INITIALIZED: 'initialized',
  PENDING: 'pending',
  REQUIRES_ACTION: 'requires_action',
  PROCESSING: 'processing',
  CAPTURED: 'captured',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  PARTIALLY_REFUNDED: 'partially_refunded',
  REFUNDED: 'refunded',
  OFFLINE_PENDING: 'offline_pending',
  OFFLINE_REJECTED: 'offline_rejected',
});

export const PAYMENT_STATUS_VALUES = Object.freeze(
  Object.values(PAYMENT_STATUSES),
);

export const REFUND_STATUSES = Object.freeze({
  PENDING: 'pending',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
});

export const REFUND_STATUS_VALUES = Object.freeze(
  Object.values(REFUND_STATUSES),
);

export const COUPON_TYPES = Object.freeze({
  PERCENTAGE: 'percentage',
  FIXED: 'fixed',
});

export const COUPON_TYPE_VALUES = Object.freeze(Object.values(COUPON_TYPES));

export const PAYMENT_HISTORY_SOURCES = Object.freeze({
  USER: 'user',
  ADMIN: 'admin',
  WEBHOOK: 'webhook',
  SYSTEM: 'system',
});

export const PAYMENT_HISTORY_SOURCE_VALUES = Object.freeze(
  Object.values(PAYMENT_HISTORY_SOURCES),
);
