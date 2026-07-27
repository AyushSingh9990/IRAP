import Stripe from 'stripe';
import { environment } from '../../config/environment.js';
import { ApiError } from '../../utils/ApiError.js';

let client;

function getClient() {
  if (!environment.payments.stripe.enabled) {
    throw new ApiError(503, 'Stripe payments are not configured.');
  }

  client ||= new Stripe(environment.payments.stripe.secretKey);
  return client;
}

export async function createStripePaymentIntent({
  amountMinor,
  currency,
  description,
  metadata,
  receiptEmail,
  idempotencyKey,
}) {
  const intent = await getClient().paymentIntents.create(
    {
      amount: amountMinor,
      currency: currency.toLowerCase(),
      description,
      metadata,
      receipt_email: receiptEmail,
      automatic_payment_methods: { enabled: true },
    },
    { idempotencyKey },
  );

  return {
    id: intent.id,
    clientSecret: intent.client_secret,
    status: intent.status,
    publicKey: environment.payments.stripe.publicKey,
  };
}

export async function fetchStripePaymentIntent(paymentIntentId) {
  return getClient().paymentIntents.retrieve(paymentIntentId);
}

export function constructStripeWebhookEvent(rawBody, signature) {
  if (!environment.payments.stripe.webhookSecret) {
    throw new ApiError(503, 'Stripe webhook verification is not configured.');
  }
  return getClient().webhooks.constructEvent(
    rawBody,
    signature,
    environment.payments.stripe.webhookSecret,
  );
}

export async function refundStripePayment({
  paymentIntentId,
  amountMinor,
  metadata,
}) {
  return getClient().refunds.create({
    payment_intent: paymentIntentId,
    amount: amountMinor,
    metadata,
  });
}
