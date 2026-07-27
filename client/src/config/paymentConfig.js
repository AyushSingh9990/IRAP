export const paymentStatusLabels = Object.freeze({
  initialized: 'Initialized',
  pending: 'Pending',
  requires_action: 'Action required',
  processing: 'Processing',
  captured: 'Paid',
  failed: 'Failed',
  cancelled: 'Cancelled',
  partially_refunded: 'Partially refunded',
  refunded: 'Refunded',
  offline_pending: 'Offline review pending',
  offline_rejected: 'Offline payment rejected',
});

export const paymentStatusTones = Object.freeze({
  initialized: 'neutral',
  pending: 'warning',
  requires_action: 'warning',
  processing: 'warning',
  captured: 'success',
  failed: 'danger',
  cancelled: 'neutral',
  partially_refunded: 'warning',
  refunded: 'neutral',
  offline_pending: 'warning',
  offline_rejected: 'danger',
});

export const providerLabels = Object.freeze({
  razorpay: 'Razorpay',
  stripe: 'Stripe',
  offline: 'Offline bank transfer',
});

export function formatMinorAmount(amountMinor, currency = 'INR') {
  const normalizedCurrency = String(currency || 'INR').toUpperCase();
  try {
    const formatter = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: normalizedCurrency,
    });
    const digits = formatter.resolvedOptions().maximumFractionDigits;
    return formatter.format(Number(amountMinor || 0) / 10 ** digits);
  } catch {
    return `${normalizedCurrency} ${Number(amountMinor || 0)}`;
  }
}

export function createIdempotencyKey(prefix = 'payment') {
  const random = globalThis.crypto?.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${random}`;
}
