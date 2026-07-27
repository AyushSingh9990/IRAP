import { describe, expect, it } from 'vitest';
import {
  createIdempotencyKey,
  formatMinorAmount,
  paymentStatusLabels,
} from './paymentConfig.js';

describe('payment configuration', () => {
  it('formats two-decimal and zero-decimal currencies from minor units', () => {
    expect(formatMinorAmount(12345, 'INR')).toContain('123.45');
    expect(formatMinorAmount(123, 'JPY')).toContain('123');
  });

  it('creates distinct idempotency keys with the requested prefix', () => {
    const first = createIdempotencyKey('stripe');
    const second = createIdempotencyKey('stripe');
    expect(first).toMatch(/^stripe-/);
    expect(second).toMatch(/^stripe-/);
    expect(first).not.toBe(second);
  });

  it('provides labels for captured and refunded states', () => {
    expect(paymentStatusLabels.captured).toBe('Paid');
    expect(paymentStatusLabels.refunded).toBe('Refunded');
  });
});
