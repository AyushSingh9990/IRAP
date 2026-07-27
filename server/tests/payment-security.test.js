import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  verifyRazorpayCheckoutSignature,
  verifyRazorpayWebhookSignature,
} from '../src/integrations/payments/razorpay.adapter.js';
import WebhookEvent from '../src/models/WebhookEvent.js';

const checkoutSecret = 'unit-test-razorpay-secret';
const webhookSecret = 'unit-test-razorpay-webhook-secret';

describe('payment verification hardening', () => {
  it('accepts a valid Razorpay checkout signature', () => {
    const orderId = 'order_123';
    const paymentId = 'pay_456';
    const signature = createHmac('sha256', checkoutSecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    expect(
      verifyRazorpayCheckoutSignature({ orderId, paymentId, signature }),
    ).toBe(true);
  });

  it('rejects an altered Razorpay checkout signature', () => {
    expect(
      verifyRazorpayCheckoutSignature({
        orderId: 'order_123',
        paymentId: 'pay_456',
        signature: '0'.repeat(64),
      }),
    ).toBe(false);
  });

  it('verifies webhook signatures over the raw request body', () => {
    const rawBody = Buffer.from('{"event":"payment.captured"}');
    const signature = createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    expect(verifyRazorpayWebhookSignature(rawBody, signature)).toBe(true);
  });

  it('defines a unique provider and event identifier index for idempotency', () => {
    const index = WebhookEvent.schema.indexes().find(
      ([fields]) => fields.provider === 1 && fields.eventId === 1,
    );

    expect(index).toBeTruthy();
    expect(index[1].unique).toBe(true);
  });
});
