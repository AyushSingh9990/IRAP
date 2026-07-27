import crypto from 'node:crypto';
import { customAlphabet } from 'nanoid';
import { environment } from '../config/environment.js';
import { logger } from '../config/logger.js';
import { APPLICATION_STATUSES } from '../constants/applicationStatuses.js';
import { DOCUMENT_CATEGORIES } from '../constants/documentCategories.js';
import {
  PAYMENT_HISTORY_SOURCES,
  PAYMENT_PROVIDERS,
  PAYMENT_STATUSES,
  REFUND_STATUSES,
} from '../constants/paymentConstants.js';
import { PERMISSIONS } from '../constants/permissions.js';
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_TYPES,
} from '../constants/notificationConstants.js';
import {
  createRazorpayOrder,
  fetchRazorpayPayment,
  refundRazorpayPayment,
  verifyRazorpayCheckoutSignature,
  verifyRazorpayWebhookSignature,
} from '../integrations/payments/razorpay.adapter.js';
import {
  constructStripeWebhookEvent,
  createStripePaymentIntent,
  fetchStripePaymentIntent,
  refundStripePayment,
} from '../integrations/payments/stripe.adapter.js';
import Application from '../models/Application.js';
import Coupon from '../models/Coupon.js';
import CouponRedemption from '../models/CouponRedemption.js';
import Document from '../models/Document.js';
import Payment from '../models/Payment.js';
import Plan from '../models/Plan.js';
import Receipt from '../models/Receipt.js';
import WebhookEvent from '../models/WebhookEvent.js';
import { ApiError } from '../utils/ApiError.js';
import { calculatePaymentQuote } from './paymentPricing.service.js';
import { createReceiptPdf, issueReceipt } from './receipt.service.js';
import { createNotificationSafely } from './notification.service.js';

const referenceSuffix = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 10);

function paymentReference() {
  return `PAY-${new Date().getUTCFullYear()}-${referenceSuffix()}`;
}

function appendHistory(payment, {
  status,
  source,
  changedBy = null,
  message = '',
  providerEventId = '',
}) {
  const previousStatus = payment.status || null;
  if (previousStatus === status && !providerEventId) return false;

  payment.status = status;
  payment.statusHistory.push({
    previousStatus,
    newStatus: status,
    source,
    changedBy,
    message,
    providerEventId,
    changedAt: new Date(),
  });
  return true;
}

function serializePayment(payment) {
  const object = payment.toJSON();
  object.refundableMinor = Math.max(0, object.totalMinor - object.refundedMinor);
  object.hasReceipt = Boolean(object.receipt);
  return object;
}

function assertPaymentsEnabled() {
  if (!environment.payments.enabled) {
    throw new ApiError(503, 'Payment processing is not enabled.');
  }
}

function assertProviderEnabled(provider) {
  const enabled = {
    [PAYMENT_PROVIDERS.RAZORPAY]: environment.payments.razorpay.enabled,
    [PAYMENT_PROVIDERS.STRIPE]: environment.payments.stripe.enabled,
    [PAYMENT_PROVIDERS.OFFLINE]: environment.payments.offline.enabled,
  }[provider];
  if (!enabled) throw new ApiError(422, 'The selected payment method is unavailable.');
}

async function getPayableApplication({ applicationId, ownerId }) {
  const application = await Application.findOne({ _id: applicationId, owner: ownerId });
  if (!application) throw new ApiError(404, 'Application not found.');
  if (application.status !== APPLICATION_STATUSES.PAYMENT_PENDING) {
    throw new ApiError(409, 'This application is not awaiting payment.');
  }

  const completed = await Payment.findOne({
    application: application._id,
    status: {
      $in: [
        PAYMENT_STATUSES.CAPTURED,
        PAYMENT_STATUSES.PARTIALLY_REFUNDED,
        PAYMENT_STATUSES.REFUNDED,
      ],
    },
  }).select('_id');
  if (completed) throw new ApiError(409, 'Payment has already been recorded for this application.');
  return application;
}

async function buildPayment({
  application,
  ownerId,
  provider,
  idempotencyKey,
  quote,
  billing,
}) {
  const payment = new Payment({
    reference: paymentReference(),
    owner: ownerId,
    application: application._id,
    plan: quote.plan._id,
    purpose: application.purpose || 'initial',
    coupon: quote.coupon?._id || null,
    taxRate: quote.taxRate?._id || null,
    provider,
    idempotencyKey,
    currency: quote.currency,
    subtotalMinor: quote.subtotalMinor,
    discountMinor: quote.discountMinor,
    taxableMinor: quote.taxableMinor,
    taxMinor: quote.taxMinor,
    totalMinor: quote.totalMinor,
    planSnapshot: {
      code: quote.plan.code,
      name: quote.plan.name,
      applicationTypes: quote.plan.applicationTypes,
      purposes: quote.plan.purposes,
    },
    couponSnapshot: quote.coupon
      ? {
          code: quote.coupon.code,
          description: quote.coupon.description,
          type: quote.coupon.type,
          value: quote.coupon.value,
        }
      : {},
    taxSnapshot: quote.taxRate
      ? {
          code: quote.taxRate.code,
          name: quote.taxRate.name,
          rateBasisPoints: quote.taxRate.rateBasisPoints,
          inclusive: quote.taxRate.inclusive,
        }
      : {},
    billing,
    statusHistory: [
      {
        previousStatus: null,
        newStatus: PAYMENT_STATUSES.INITIALIZED,
        source: PAYMENT_HISTORY_SOURCES.USER,
        changedBy: ownerId,
        message: 'Payment record initialized.',
      },
    ],
  });
  await payment.save();
  return payment;
}

async function createRedemption(payment) {
  if (!payment.coupon) return;

  try {
    await CouponRedemption.create({
      coupon: payment.coupon,
      user: payment.owner,
      payment: payment._id,
    });
    await Coupon.updateOne({ _id: payment.coupon }, { $inc: { usedCount: 1 } });
  } catch (error) {
    if (error?.code !== 11000) throw error;
  }
}

function assertIdempotentPaymentMatches(existing, { ownerId, applicationId, planId, provider }) {
  if (!existing.owner.equals(ownerId)) {
    throw new ApiError(409, 'The idempotency key is already in use.');
  }

  const matchesRequest =
    String(existing.application) === String(applicationId) &&
    String(existing.plan) === String(planId) &&
    existing.provider === provider;

  if (!matchesRequest) {
    throw new ApiError(409, 'The idempotency key belongs to a different payment request.');
  }
}

async function resumeProviderSession(payment) {
  if (
    [
      PAYMENT_STATUSES.CAPTURED,
      PAYMENT_STATUSES.PARTIALLY_REFUNDED,
      PAYMENT_STATUSES.REFUNDED,
      PAYMENT_STATUSES.CANCELLED,
    ].includes(payment.status)
  ) {
    return null;
  }

  if (payment.provider === PAYMENT_PROVIDERS.RAZORPAY && payment.providerOrderId) {
    return {
      id: payment.providerOrderId,
      amountMinor: payment.totalMinor,
      currency: payment.currency,
      status: payment.status,
      publicKey: environment.payments.razorpay.keyId,
    };
  }

  if (payment.provider === PAYMENT_PROVIDERS.STRIPE && payment.providerOrderId) {
    let intent;
    try {
      intent = await fetchStripePaymentIntent(payment.providerOrderId);
    } catch {
      throw new ApiError(502, 'Stripe could not resume the existing payment session.');
    }
    return {
      id: intent.id,
      clientSecret: intent.client_secret,
      status: intent.status,
      publicKey: environment.payments.stripe.publicKey,
    };
  }

  return null;
}

async function markApplicationPaid(payment, changedBy) {
  const application = await Application.findById(payment.application);
  if (!application || application.status === APPLICATION_STATUSES.PAYMENT_CONFIRMED) return;
  if (application.status !== APPLICATION_STATUSES.PAYMENT_PENDING) return;

  application.statusHistory.push({
    previousStatus: application.status,
    newStatus: APPLICATION_STATUSES.PAYMENT_CONFIRMED,
    changedBy,
    applicantVisibleNote: 'Payment confirmed. The application is ready for review.',
    relatedPayment: payment._id,
    changedAt: new Date(),
  });
  application.status = APPLICATION_STATUSES.PAYMENT_CONFIRMED;
  await application.save();
}

async function markCaptured(payment, {
  providerPaymentId = '',
  changedBy,
  source,
  providerEventId = '',
  message = 'Payment confirmed.',
}) {
  const alreadyConfirmed = [
    PAYMENT_STATUSES.CAPTURED,
    PAYMENT_STATUSES.PARTIALLY_REFUNDED,
    PAYMENT_STATUSES.REFUNDED,
  ].includes(payment.status);

  if (!alreadyConfirmed) {
    payment.providerPaymentId = providerPaymentId || payment.providerPaymentId;
    payment.paidAt = payment.paidAt || new Date();
    payment.failureCode = '';
    payment.failureMessage = '';
    appendHistory(payment, {
      status: PAYMENT_STATUSES.CAPTURED,
      source,
      changedBy,
      message,
      providerEventId,
    });
    await payment.save();
  } else if (providerPaymentId && !payment.providerPaymentId) {
    payment.providerPaymentId = providerPaymentId;
    await payment.save();
  }

  await Promise.all([
    createRedemption(payment),
    markApplicationPaid(payment, changedBy || payment.owner),
  ]);
  await issueReceipt(payment);

  if (!alreadyConfirmed) {
    logger.info(
      { paymentId: payment.id, provider: payment.provider, reference: payment.reference },
      'Payment captured',
    );
    await createNotificationSafely({
      recipient: payment.owner,
      type: NOTIFICATION_TYPES.PAYMENT_SUCCESS,
      category: NOTIFICATION_CATEGORIES.PAYMENT,
      title: 'Payment confirmed',
      message: `${payment.reference} was confirmed successfully.`,
      actionUrl: '/dashboard/payments',
      payment: payment._id,
      application: payment.application,
      reference: payment.reference,
      dedupeKey: `payment-captured:${payment.id}`,
    });
  }
  return payment;
}

async function recordFailed(payment, {
  source,
  code = '',
  message = 'Payment failed.',
  providerEventId = '',
}) {
  if (
    [
      PAYMENT_STATUSES.CAPTURED,
      PAYMENT_STATUSES.PARTIALLY_REFUNDED,
      PAYMENT_STATUSES.REFUNDED,
      PAYMENT_STATUSES.CANCELLED,
    ].includes(payment.status)
  ) return;
  payment.failureCode = String(code || '').slice(0, 160);
  payment.failureMessage = String(message || '').slice(0, 1000);
  appendHistory(payment, {
    status: PAYMENT_STATUSES.FAILED,
    source,
    changedBy: payment.owner,
    message: payment.failureMessage,
    providerEventId,
  });
  await payment.save();
  await createNotificationSafely({
    recipient: payment.owner,
    type: NOTIFICATION_TYPES.PAYMENT_FAILURE,
    category: NOTIFICATION_CATEGORIES.PAYMENT,
    title: 'Payment was not completed',
    message: payment.failureMessage || 'The payment could not be completed.',
    actionUrl: '/dashboard/payments',
    payment: payment._id,
    application: payment.application,
    reference: payment.reference,
    dedupeKey: `payment-failed:${payment.id}:${payment.statusHistory.length}`,
  });
}

export async function listActivePlans({ applicationType = '', purpose = '' } = {}) {
  const query = { active: true };
  if (applicationType) query.applicationTypes = applicationType;
  if (purpose === 'initial') {
    query.$or = [{ purposes: purpose }, { purposes: { $exists: false } }];
  } else if (purpose) {
    query.purposes = purpose;
  }
  return Plan.find(query).sort({ sortOrder: 1, amountMinor: 1, name: 1 });
}

export async function quotePayment({ ownerId, input }) {
  assertPaymentsEnabled();
  const application = await getPayableApplication({
    applicationId: input.applicationId,
    ownerId,
  });
  const quote = await calculatePaymentQuote({
    planId: input.planId,
    couponCode: input.couponCode,
    applicationType: application.type,
    purpose: application.purpose || 'initial',
    userId: ownerId,
    billingCountry: input.billingCountry,
    billingState: input.billingState,
  });
  return quote.summary;
}

export async function initializePayment({ ownerId, input }) {
  assertPaymentsEnabled();
  assertProviderEnabled(input.provider);
  if (input.provider === PAYMENT_PROVIDERS.OFFLINE) {
    throw new ApiError(422, 'Use the offline-payment submission endpoint.');
  }

  const existing = await Payment.findOne({ idempotencyKey: input.idempotencyKey });
  if (existing) {
    assertIdempotentPaymentMatches(existing, {
      ownerId,
      applicationId: input.applicationId,
      planId: input.planId,
      provider: input.provider,
    });
    return {
      payment: serializePayment(existing),
      providerSession: await resumeProviderSession(existing),
    };
  }

  const application = await getPayableApplication({
    applicationId: input.applicationId,
    ownerId,
  });
  const quote = await calculatePaymentQuote({
    planId: input.planId,
    couponCode: input.couponCode,
    applicationType: application.type,
    purpose: application.purpose || 'initial',
    userId: ownerId,
    billingCountry: input.billing.countryCode,
    billingState: input.billing.state,
  });

  if (quote.totalMinor < 1) {
    throw new ApiError(422, 'The payable amount must be greater than zero.');
  }

  const payment = await buildPayment({
    application,
    ownerId,
    provider: input.provider,
    idempotencyKey: input.idempotencyKey,
    quote,
    billing: input.billing,
  });

  try {
    let providerSession;
    if (input.provider === PAYMENT_PROVIDERS.RAZORPAY) {
      providerSession = await createRazorpayOrder({
        amountMinor: payment.totalMinor,
        currency: payment.currency,
        receipt: payment.reference,
        notes: {
          paymentReference: payment.reference,
          applicationId: String(application._id),
          userId: String(ownerId),
        },
      });
      payment.providerOrderId = providerSession.id;
      appendHistory(payment, {
        status: PAYMENT_STATUSES.PENDING,
        source: PAYMENT_HISTORY_SOURCES.SYSTEM,
        changedBy: ownerId,
        message: 'Razorpay order created.',
      });
    } else {
      providerSession = await createStripePaymentIntent({
        amountMinor: payment.totalMinor,
        currency: payment.currency,
        description: `${payment.planSnapshot.name} - ${application.reference}`,
        metadata: {
          paymentReference: payment.reference,
          applicationId: String(application._id),
          userId: String(ownerId),
        },
        receiptEmail: payment.billing.email,
        idempotencyKey: input.idempotencyKey,
      });
      payment.providerOrderId = providerSession.id;
      appendHistory(payment, {
        status: PAYMENT_STATUSES.REQUIRES_ACTION,
        source: PAYMENT_HISTORY_SOURCES.SYSTEM,
        changedBy: ownerId,
        message: 'Stripe PaymentIntent created.',
      });
    }
    await payment.save();
    return { payment: serializePayment(payment), providerSession };
  } catch (error) {
    await recordFailed(payment, {
      source: PAYMENT_HISTORY_SOURCES.SYSTEM,
      code: error.code || error.name,
      message: error.message || 'Payment provider initialization failed.',
    });
    throw new ApiError(502, 'The payment provider could not initialize the transaction.');
  }
}

export async function confirmRazorpayCheckout({ ownerId, input }) {
  assertPaymentsEnabled();
  assertProviderEnabled(PAYMENT_PROVIDERS.RAZORPAY);
  const payment = await Payment.findOne({
    _id: input.paymentId,
    owner: ownerId,
    provider: PAYMENT_PROVIDERS.RAZORPAY,
  });
  if (!payment) throw new ApiError(404, 'Payment not found.');
  if (payment.providerOrderId !== input.razorpayOrderId) {
    throw new ApiError(422, 'The Razorpay order does not match this payment.');
  }
  if (!verifyRazorpayCheckoutSignature({
    orderId: input.razorpayOrderId,
    paymentId: input.razorpayPaymentId,
    signature: input.razorpaySignature,
  })) {
    throw new ApiError(422, 'Razorpay payment signature verification failed.');
  }

  let providerPayment;
  try {
    providerPayment = await fetchRazorpayPayment(input.razorpayPaymentId);
  } catch {
    throw new ApiError(502, 'Razorpay could not verify the payment at this time.');
  }
  if (
    providerPayment.order_id !== payment.providerOrderId ||
    Number(providerPayment.amount) !== payment.totalMinor ||
    String(providerPayment.currency).toUpperCase() !== payment.currency
  ) {
    throw new ApiError(422, 'Razorpay payment details do not match the initialized payment.');
  }

  payment.providerPaymentId = providerPayment.id;
  payment.providerSignatureHash = crypto
    .createHash('sha256')
    .update(input.razorpaySignature)
    .digest('hex');
  if (providerPayment.status === 'captured') {
    await markCaptured(payment, {
      providerPaymentId: providerPayment.id,
      changedBy: ownerId,
      source: PAYMENT_HISTORY_SOURCES.USER,
      message: 'Razorpay payment verified and captured.',
    });
  } else {
    appendHistory(payment, {
      status: PAYMENT_STATUSES.PROCESSING,
      source: PAYMENT_HISTORY_SOURCES.USER,
      changedBy: ownerId,
      message: 'Razorpay payment verified and is awaiting capture confirmation.',
    });
    await payment.save();
  }

  return serializePayment(payment);
}

export async function syncStripePayment({ ownerId, paymentId }) {
  assertPaymentsEnabled();
  assertProviderEnabled(PAYMENT_PROVIDERS.STRIPE);
  const payment = await Payment.findOne({
    _id: paymentId,
    owner: ownerId,
    provider: PAYMENT_PROVIDERS.STRIPE,
  });
  if (!payment) throw new ApiError(404, 'Stripe payment not found.');
  if (!payment.providerOrderId) throw new ApiError(409, 'Stripe PaymentIntent ID is unavailable.');

  let intent;
  try {
    intent = await fetchStripePaymentIntent(payment.providerOrderId);
  } catch {
    throw new ApiError(502, 'Stripe could not verify the payment at this time.');
  }
  if (
    Number(intent.amount) !== payment.totalMinor ||
    String(intent.currency).toUpperCase() !== payment.currency ||
    intent.metadata?.paymentReference !== payment.reference
  ) {
    throw new ApiError(422, 'Stripe payment details do not match the initialized payment.');
  }

  if (intent.status === 'succeeded') {
    await markCaptured(payment, {
      providerPaymentId: intent.latest_charge || payment.providerPaymentId,
      changedBy: ownerId,
      source: PAYMENT_HISTORY_SOURCES.USER,
      message: 'Stripe payment synchronized and confirmed.',
    });
  } else if (intent.status === 'canceled') {
    appendHistory(payment, {
      status: PAYMENT_STATUSES.CANCELLED,
      source: PAYMENT_HISTORY_SOURCES.USER,
      changedBy: ownerId,
      message: 'Stripe PaymentIntent is cancelled.',
    });
    payment.cancelledAt = new Date();
    await payment.save();
  } else if (intent.status === 'requires_payment_method') {
    await recordFailed(payment, {
      source: PAYMENT_HISTORY_SOURCES.USER,
      code: intent.last_payment_error?.code,
      message: intent.last_payment_error?.message || 'Stripe requires another payment method.',
    });
  } else {
    appendHistory(payment, {
      status: PAYMENT_STATUSES.PROCESSING,
      source: PAYMENT_HISTORY_SOURCES.USER,
      changedBy: ownerId,
      message: `Stripe payment status: ${intent.status}.`,
    });
    await payment.save();
  }

  return serializePayment(payment);
}

export async function submitOfflinePayment({ ownerId, input }) {
  assertPaymentsEnabled();
  assertProviderEnabled(PAYMENT_PROVIDERS.OFFLINE);

  const paidAt = new Date(input.paidAt);
  if (paidAt.getTime() > Date.now() + 5 * 60_000) {
    throw new ApiError(422, 'Offline payment time cannot be in the future.');
  }

  const normalizedReference = input.reference.trim().toUpperCase();
  const existing = await Payment.findOne({ idempotencyKey: input.idempotencyKey });
  if (existing) {
    assertIdempotentPaymentMatches(existing, {
      ownerId,
      applicationId: input.applicationId,
      planId: input.planId,
      provider: PAYMENT_PROVIDERS.OFFLINE,
    });
    return serializePayment(existing);
  }

  const duplicateReference = await Payment.findOne({
    owner: ownerId,
    provider: PAYMENT_PROVIDERS.OFFLINE,
    'offlineDetails.reference': normalizedReference,
  }).select('_id');
  if (duplicateReference) {
    throw new ApiError(409, 'This offline transaction reference has already been submitted.');
  }

  const application = await getPayableApplication({ applicationId: input.applicationId, ownerId });
  const quote = await calculatePaymentQuote({
    planId: input.planId,
    couponCode: input.couponCode,
    applicationType: application.type,
    purpose: application.purpose || 'initial',
    userId: ownerId,
    billingCountry: input.billing.countryCode,
    billingState: input.billing.state,
  });

  if (quote.totalMinor < 1) {
    throw new ApiError(422, 'The payable amount must be greater than zero.');
  }

  if (input.proofDocumentId) {
    const proof = await Document.findOne({
      _id: input.proofDocumentId,
      owner: ownerId,
      application: application._id,
      category: DOCUMENT_CATEGORIES.PAYMENT_PROOF,
      deletedAt: null,
    });
    if (!proof) throw new ApiError(422, 'The selected payment proof document is invalid.');
  }

  const payment = await buildPayment({
    application,
    ownerId,
    provider: PAYMENT_PROVIDERS.OFFLINE,
    idempotencyKey: input.idempotencyKey,
    quote,
    billing: input.billing,
  });
  payment.offlineDetails = {
    reference: normalizedReference,
    bankName: input.bankName,
    paidAt,
    proofDocument: input.proofDocumentId || null,
    applicantNote: input.applicantNote,
  };
  appendHistory(payment, {
    status: PAYMENT_STATUSES.OFFLINE_PENDING,
    source: PAYMENT_HISTORY_SOURCES.USER,
    changedBy: ownerId,
    message: 'Offline payment submitted for finance review.',
  });
  await payment.save();
  await createNotificationSafely({
    recipient: ownerId,
    type: NOTIFICATION_TYPES.PAYMENT_PENDING,
    category: NOTIFICATION_CATEGORIES.PAYMENT,
    title: 'Offline payment submitted',
    message: `${payment.reference} is awaiting finance verification.`,
    actionUrl: '/dashboard/payments',
    payment: payment._id,
    application: payment.application,
    reference: payment.reference,
    dedupeKey: `offline-payment-submitted:${payment.id}`,
  });
  return serializePayment(payment);
}

export async function listPaymentsForOwner(ownerId) {
  const payments = await Payment.find({ owner: ownerId })
    .populate('application', 'reference type status')
    .populate('receipt', 'receiptNumber issuedAt')
    .sort({ createdAt: -1 });
  return payments.map(serializePayment);
}

export async function getPaymentForOwner({ paymentId, ownerId }) {
  const payment = await Payment.findOne({ _id: paymentId, owner: ownerId })
    .populate('application', 'reference type status')
    .populate('receipt');
  if (!payment) throw new ApiError(404, 'Payment not found.');
  return serializePayment(payment);
}

export async function getReceiptForAccess({ paymentId, auth }) {
  const query = { _id: paymentId };
  if (!auth.permissions.includes(PERMISSIONS.PAYMENT_MANAGE)) query.owner = auth.userId;
  const payment = await Payment.findOne(query);
  if (!payment) throw new ApiError(404, 'Payment not found.');
  if (!payment.receipt) throw new ApiError(409, 'A receipt is not available for this payment.');
  const receipt = await Receipt.findById(payment.receipt);
  if (!receipt) throw new ApiError(404, 'Receipt not found.');
  return { receipt, pdf: await createReceiptPdf(receipt) };
}

export async function listPaymentsForReview({ filters }) {
  const page = filters.page;
  const limit = filters.limit;
  const query = {};
  if (filters.status) query.status = filters.status;
  if (filters.provider) query.provider = filters.provider;
  if (filters.search) {
    query.$or = [
      { reference: { $regex: filters.search, $options: 'i' } },
      { providerOrderId: { $regex: filters.search, $options: 'i' } },
      { providerPaymentId: { $regex: filters.search, $options: 'i' } },
      { 'billing.email': { $regex: filters.search, $options: 'i' } },
    ];
  }

  const [payments, total] = await Promise.all([
    Payment.find(query)
      .select('+internalNote')
      .populate('owner', 'displayName email')
      .populate('application', 'reference type status')
      .populate('receipt', 'receiptNumber issuedAt')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Payment.countDocuments(query),
  ]);

  return {
    payments: payments.map((payment) => {
      const serialized = payment.toJSON();
      serialized.internalNote = payment.internalNote;
      serialized.refundableMinor = Math.max(0, payment.totalMinor - payment.refundedMinor);
      return serialized;
    }),
    meta: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  };
}

export async function reviewOfflinePayment({ paymentId, reviewerId, input }) {
  const payment = await Payment.findOne({
    _id: paymentId,
    provider: PAYMENT_PROVIDERS.OFFLINE,
  }).select('+internalNote');
  if (!payment) throw new ApiError(404, 'Offline payment not found.');
  if (payment.status !== PAYMENT_STATUSES.OFFLINE_PENDING) {
    throw new ApiError(409, 'This offline payment has already been reviewed.');
  }

  payment.offlineDetails.reviewerNote = input.note;
  payment.offlineDetails.reviewedBy = reviewerId;
  payment.offlineDetails.reviewedAt = new Date();
  payment.internalNote = input.internalNote || '';

  if (input.action === 'approve') {
    await markCaptured(payment, {
      changedBy: reviewerId,
      source: PAYMENT_HISTORY_SOURCES.ADMIN,
      message: input.note || 'Offline payment approved by finance.',
    });
  } else {
    appendHistory(payment, {
      status: PAYMENT_STATUSES.OFFLINE_REJECTED,
      source: PAYMENT_HISTORY_SOURCES.ADMIN,
      changedBy: reviewerId,
      message: input.note || 'Offline payment rejected by finance.',
    });
    await payment.save();
  }

  logger.info(
    { paymentId: payment.id, action: input.action, reviewerId },
    'Offline payment reviewed',
  );
  return serializePayment(payment);
}

function providerRefundStatus(provider, refund) {
  const status = String(refund?.status || '').toLowerCase();
  if (['failed', 'cancelled', 'canceled'].includes(status)) {
    return REFUND_STATUSES.FAILED;
  }
  if (provider === PAYMENT_PROVIDERS.RAZORPAY) {
    return status === 'processed' ? REFUND_STATUSES.SUCCEEDED : REFUND_STATUSES.PENDING;
  }
  return status === 'succeeded' ? REFUND_STATUSES.SUCCEEDED : REFUND_STATUSES.PENDING;
}

export async function refundPayment({ paymentId, reviewerId, input }) {
  const payment = await Payment.findById(paymentId);
  if (!payment) throw new ApiError(404, 'Payment not found.');
  if (![PAYMENT_STATUSES.CAPTURED, PAYMENT_STATUSES.PARTIALLY_REFUNDED].includes(payment.status)) {
    throw new ApiError(409, 'Only captured payments can be refunded.');
  }
  const refundableMinor = payment.totalMinor - payment.refundedMinor;
  if (input.amountMinor > refundableMinor) {
    throw new ApiError(422, 'The refund amount exceeds the remaining refundable amount.');
  }

  let providerRefund;
  try {
    if (payment.provider === PAYMENT_PROVIDERS.RAZORPAY) {
      if (!payment.providerPaymentId) {
        throw new ApiError(409, 'Razorpay payment ID is unavailable.');
      }
      providerRefund = await refundRazorpayPayment({
        paymentId: payment.providerPaymentId,
        amountMinor: input.amountMinor,
        notes: { reason: input.reason, paymentReference: payment.reference },
      });
    } else if (payment.provider === PAYMENT_PROVIDERS.STRIPE) {
      providerRefund = await refundStripePayment({
        paymentIntentId: payment.providerOrderId,
        amountMinor: input.amountMinor,
        metadata: { reason: input.reason, paymentReference: payment.reference },
      });
    } else {
      providerRefund = {
        id: `offline-${Date.now()}`,
        status: 'succeeded',
      };
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(502, 'The payment provider could not create the refund.');
  }

  const status = providerRefundStatus(payment.provider, providerRefund);
  payment.refunds.push({
    providerRefundId: providerRefund.id,
    amountMinor: input.amountMinor,
    currency: payment.currency,
    status,
    reason: input.reason,
    requestedBy: reviewerId,
    requestedAt: new Date(),
    processedAt: status === REFUND_STATUSES.SUCCEEDED ? new Date() : null,
    failureMessage:
      status === REFUND_STATUSES.FAILED
        ? String(providerRefund.failure_reason || providerRefund.error?.message || 'Refund failed.')
        : '',
  });

  if (status === REFUND_STATUSES.SUCCEEDED) {
    payment.refundedMinor += input.amountMinor;
    appendHistory(payment, {
      status:
        payment.refundedMinor >= payment.totalMinor
          ? PAYMENT_STATUSES.REFUNDED
          : PAYMENT_STATUSES.PARTIALLY_REFUNDED,
      source: PAYMENT_HISTORY_SOURCES.ADMIN,
      changedBy: reviewerId,
      message: `Refund recorded: ${input.amountMinor} ${payment.currency} minor units.`,
    });
  }
  await payment.save();

  logger.info(
    { paymentId: payment.id, refundId: providerRefund.id, amountMinor: input.amountMinor },
    'Payment refund requested',
  );
  return serializePayment(payment);
}

async function registerWebhook({ provider, eventId, eventType, rawBody }) {
  const payloadHash = crypto.createHash('sha256').update(rawBody).digest('hex');
  try {
    return await WebhookEvent.create({ provider, eventId, eventType, payloadHash });
  } catch (error) {
    if (error?.code !== 11000) throw error;

    const retryBefore = new Date(Date.now() - 5 * 60_000);
    return WebhookEvent.findOneAndUpdate(
      {
        provider,
        eventId,
        payloadHash,
        $or: [
          { processingStatus: 'failed' },
          { processingStatus: 'received', updatedAt: { $lte: retryBefore } },
        ],
      },
      {
        $set: {
          eventType,
          payloadHash,
          processingStatus: 'received',
          errorMessage: '',
          processedAt: null,
        },
      },
      { new: true },
    );
  }
}

async function finishWebhook(webhook, status, errorMessage = '') {
  if (!webhook) return;
  webhook.processingStatus = status;
  webhook.errorMessage = errorMessage;
  webhook.processedAt = new Date();
  await webhook.save();
}

async function processRazorpayEvent(event, eventId) {
  const paymentEntity = event.payload?.payment?.entity;
  const orderEntity = event.payload?.order?.entity;
  const refundEntity = event.payload?.refund?.entity;

  let payment = null;
  if (orderEntity?.id) {
    payment = await Payment.findOne({
      provider: PAYMENT_PROVIDERS.RAZORPAY,
      providerOrderId: orderEntity.id,
    });
  }
  if (paymentEntity?.order_id) {
    payment = await Payment.findOne({
      provider: PAYMENT_PROVIDERS.RAZORPAY,
      providerOrderId: paymentEntity.order_id,
    });
  }
  if (!payment && paymentEntity?.id) {
    payment = await Payment.findOne({
      provider: PAYMENT_PROVIDERS.RAZORPAY,
      providerPaymentId: paymentEntity.id,
    });
  }
  if (!payment && refundEntity?.payment_id) {
    payment = await Payment.findOne({
      provider: PAYMENT_PROVIDERS.RAZORPAY,
      providerPaymentId: refundEntity.payment_id,
    });
  }
  if (!payment) return false;

  if (['payment.captured', 'order.paid'].includes(event.event)) {
    await markCaptured(payment, {
      providerPaymentId: paymentEntity?.id || payment.providerPaymentId,
      changedBy: payment.owner,
      source: PAYMENT_HISTORY_SOURCES.WEBHOOK,
      providerEventId: eventId,
      message: 'Razorpay webhook confirmed payment capture.',
    });
    return true;
  }
  if (event.event === 'payment.failed') {
    await recordFailed(payment, {
      source: PAYMENT_HISTORY_SOURCES.WEBHOOK,
      code: paymentEntity?.error_code,
      message: paymentEntity?.error_description || 'Razorpay reported a failed payment.',
      providerEventId: eventId,
    });
    return true;
  }
  if (event.event === 'refund.processed' && refundEntity) {
    const existing = payment.refunds.find(
      (item) => item.providerRefundId === refundEntity.id,
    );
    if (existing && existing.status !== REFUND_STATUSES.SUCCEEDED) {
      existing.status = REFUND_STATUSES.SUCCEEDED;
      existing.processedAt = new Date();
      payment.refundedMinor = Math.min(
        payment.totalMinor,
        payment.refundedMinor + existing.amountMinor,
      );
      appendHistory(payment, {
        status:
          payment.refundedMinor >= payment.totalMinor
            ? PAYMENT_STATUSES.REFUNDED
            : PAYMENT_STATUSES.PARTIALLY_REFUNDED,
        source: PAYMENT_HISTORY_SOURCES.WEBHOOK,
        changedBy: payment.owner,
        providerEventId: eventId,
        message: 'Razorpay webhook confirmed refund processing.',
      });
      await payment.save();
    }
    return true;
  }
  return false;
}

export async function handleRazorpayWebhook({ rawBody, signature, eventIdHeader }) {
  assertProviderEnabled(PAYMENT_PROVIDERS.RAZORPAY);
  if (!verifyRazorpayWebhookSignature(rawBody, signature)) {
    throw new ApiError(400, 'Invalid Razorpay webhook signature.');
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch {
    throw new ApiError(400, 'Razorpay webhook body is not valid JSON.');
  }
  const eventId = eventIdHeader || crypto.createHash('sha256').update(rawBody).digest('hex');
  const webhook = await registerWebhook({
    provider: PAYMENT_PROVIDERS.RAZORPAY,
    eventId,
    eventType: event.event || 'unknown',
    rawBody,
  });
  if (!webhook) return { duplicate: true };

  try {
    const processed = await processRazorpayEvent(event, eventId);
    await finishWebhook(webhook, processed ? 'processed' : 'ignored');
    return { duplicate: false, processed };
  } catch (error) {
    await finishWebhook(webhook, 'failed', error.message);
    throw error;
  }
}

async function processStripeEvent(event) {
  const object = event.data?.object;
  let payment = null;
  if (event.type.startsWith('payment_intent.') && object?.id) {
    payment = await Payment.findOne({
      provider: PAYMENT_PROVIDERS.STRIPE,
      providerOrderId: object.id,
    });
  } else if (event.type.startsWith('charge.') && object?.payment_intent) {
    payment = await Payment.findOne({
      provider: PAYMENT_PROVIDERS.STRIPE,
      providerOrderId: object.payment_intent,
    });
  }
  if (!payment) return false;

  if (event.type === 'payment_intent.succeeded') {
    await markCaptured(payment, {
      providerPaymentId: object.latest_charge || payment.providerPaymentId,
      changedBy: payment.owner,
      source: PAYMENT_HISTORY_SOURCES.WEBHOOK,
      providerEventId: event.id,
      message: 'Stripe webhook confirmed payment success.',
    });
    return true;
  }
  if (event.type === 'payment_intent.payment_failed') {
    await recordFailed(payment, {
      source: PAYMENT_HISTORY_SOURCES.WEBHOOK,
      code: object.last_payment_error?.code,
      message: object.last_payment_error?.message || 'Stripe reported a failed payment.',
      providerEventId: event.id,
    });
    return true;
  }
  if (event.type === 'payment_intent.canceled') {
    if (
      [
        PAYMENT_STATUSES.CAPTURED,
        PAYMENT_STATUSES.PARTIALLY_REFUNDED,
        PAYMENT_STATUSES.REFUNDED,
      ].includes(payment.status)
    ) {
      return true;
    }
    appendHistory(payment, {
      status: PAYMENT_STATUSES.CANCELLED,
      source: PAYMENT_HISTORY_SOURCES.WEBHOOK,
      changedBy: payment.owner,
      providerEventId: event.id,
      message: 'Stripe PaymentIntent was cancelled.',
    });
    payment.cancelledAt = new Date();
    await payment.save();
    return true;
  }
  if (event.type === 'charge.refunded') {
    const refundedMinor = Number(object.amount_refunded || 0);
    if (refundedMinor > payment.refundedMinor) {
      payment.refundedMinor = Math.min(refundedMinor, payment.totalMinor);
      appendHistory(payment, {
        status:
          payment.refundedMinor >= payment.totalMinor
            ? PAYMENT_STATUSES.REFUNDED
            : PAYMENT_STATUSES.PARTIALLY_REFUNDED,
        source: PAYMENT_HISTORY_SOURCES.WEBHOOK,
        changedBy: payment.owner,
        providerEventId: event.id,
        message: 'Stripe webhook updated the refunded amount.',
      });
      await payment.save();
    }
    return true;
  }
  return false;
}

export async function handleStripeWebhook({ rawBody, signature }) {
  assertProviderEnabled(PAYMENT_PROVIDERS.STRIPE);
  const event = constructStripeWebhookEvent(rawBody, signature);
  const webhook = await registerWebhook({
    provider: PAYMENT_PROVIDERS.STRIPE,
    eventId: event.id,
    eventType: event.type,
    rawBody,
  });
  if (!webhook) return { duplicate: true };

  try {
    const processed = await processStripeEvent(event);
    await finishWebhook(webhook, processed ? 'processed' : 'ignored');
    return { duplicate: false, processed };
  } catch (error) {
    await finishWebhook(webhook, 'failed', error.message);
    throw error;
  }
}
