import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import { environment } from '../../config/environment.js';
import { ApiError } from '../../utils/ApiError.js';

let client;

function getClient() {
  if (!environment.payments.razorpay.enabled) {
    throw new ApiError(503, 'Razorpay payments are not configured.');
  }

  client ||= new Razorpay({
    key_id: environment.payments.razorpay.keyId,
    key_secret: environment.payments.razorpay.keySecret,
  });

  return client;
}

function safeCompareHex(expected, supplied) {
  const left = Buffer.from(expected || '', 'utf8');
  const right = Buffer.from(supplied || '', 'utf8');
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export async function createRazorpayOrder({
  amountMinor,
  currency,
  receipt,
  notes,
}) {
  const order = await getClient().orders.create({
    amount: amountMinor,
    currency,
    receipt: receipt.slice(0, 40),
    notes,
  });

  return {
    id: order.id,
    amountMinor: order.amount,
    currency: order.currency,
    status: order.status,
    publicKey: environment.payments.razorpay.keyId,
  };
}

export async function fetchRazorpayPayment(paymentId) {
  return getClient().payments.fetch(paymentId);
}

export function verifyRazorpayCheckoutSignature({ orderId, paymentId, signature }) {
  const expected = crypto
    .createHmac('sha256', environment.payments.razorpay.keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  return safeCompareHex(expected, signature);
}

export function verifyRazorpayWebhookSignature(rawBody, signature) {
  if (!environment.payments.razorpay.webhookSecret) return false;
  const expected = crypto
    .createHmac('sha256', environment.payments.razorpay.webhookSecret)
    .update(rawBody)
    .digest('hex');
  return safeCompareHex(expected, signature);
}

export async function refundRazorpayPayment({ paymentId, amountMinor, notes }) {
  return getClient().payments.refund(paymentId, {
    amount: amountMinor,
    notes,
  });
}
