import { environment } from '../config/environment.js';
import {
  createBillingResource,
  listBillingResources,
  updateBillingResource,
} from '../services/billingAdmin.service.js';
import {
  confirmRazorpayCheckout,
  getPaymentForOwner,
  getReceiptForAccess,
  handleRazorpayWebhook,
  handleStripeWebhook,
  initializePayment,
  listActivePlans,
  listPaymentsForOwner,
  listPaymentsForReview,
  quotePayment,
  refundPayment,
  reviewOfflinePayment,
  submitOfflinePayment,
  syncStripePayment,
} from '../services/payment.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getPlans = asyncHandler(async (request, response) => {
  const plans = await listActivePlans(request.validated.query);
  response.status(200).json(
    new ApiResponse({
      message: 'Payment plans loaded.',
      data: {
        plans,
        paymentConfiguration: {
          enabled: environment.payments.enabled,
          defaultProvider: environment.payments.defaultProvider,
          providers: {
            razorpay: environment.payments.razorpay.enabled,
            stripe: environment.payments.stripe.enabled,
            offline: environment.payments.offline.enabled,
          },
          offline: {
            instructions: environment.payments.offline.instructions,
            accountName: environment.payments.offline.accountName,
            accountReference: environment.payments.offline.accountReference,
          },
        },
      },
    }),
  );
});

export const createQuote = asyncHandler(async (request, response) => {
  const quote = await quotePayment({ ownerId: request.auth.userId, input: request.validated.body });
  response.status(200).json(new ApiResponse({ message: 'Payment quote calculated.', data: { quote } }));
});

export const initialize = asyncHandler(async (request, response) => {
  const result = await initializePayment({ ownerId: request.auth.userId, input: request.validated.body });
  response.status(201).json(new ApiResponse({ message: 'Payment initialized.', data: result }));
});

export const confirmRazorpay = asyncHandler(async (request, response) => {
  const payment = await confirmRazorpayCheckout({ ownerId: request.auth.userId, input: request.validated.body });
  response.status(200).json(new ApiResponse({ message: 'Razorpay payment verified.', data: { payment } }));
});

export const syncStripe = asyncHandler(async (request, response) => {
  const payment = await syncStripePayment({
    ownerId: request.auth.userId,
    paymentId: request.validated.body.paymentId,
  });
  response.status(200).json(
    new ApiResponse({ message: 'Stripe payment synchronized.', data: { payment } }),
  );
});

export const createOffline = asyncHandler(async (request, response) => {
  const payment = await submitOfflinePayment({ ownerId: request.auth.userId, input: request.validated.body });
  response.status(201).json(new ApiResponse({ message: 'Offline payment submitted for review.', data: { payment } }));
});

export const getMyPayments = asyncHandler(async (request, response) => {
  const payments = await listPaymentsForOwner(request.auth.userId);
  response.status(200).json(new ApiResponse({ message: 'Payment history loaded.', data: { payments } }));
});

export const getMyPayment = asyncHandler(async (request, response) => {
  const payment = await getPaymentForOwner({ paymentId: request.validated.params.paymentId, ownerId: request.auth.userId });
  response.status(200).json(new ApiResponse({ message: 'Payment loaded.', data: { payment } }));
});

export const downloadReceipt = asyncHandler(async (request, response) => {
  const { receipt, pdf } = await getReceiptForAccess({ paymentId: request.validated.params.paymentId, auth: request.auth });
  response.setHeader('Content-Type', 'application/pdf');
  response.setHeader('Cache-Control', 'private, no-store, max-age=0');
  response.setHeader('Content-Disposition', `attachment; filename="${receipt.receiptNumber}.pdf"`);
  response.setHeader('Content-Length', pdf.length);
  response.status(200).send(pdf);
});

export const getPaymentQueue = asyncHandler(async (request, response) => {
  const result = await listPaymentsForReview({ filters: request.validated.query });
  response.status(200).json(new ApiResponse({ message: 'Payment queue loaded.', data: { payments: result.payments }, meta: result.meta }));
});

export const reviewOffline = asyncHandler(async (request, response) => {
  const payment = await reviewOfflinePayment({
    paymentId: request.validated.params.paymentId,
    reviewerId: request.auth.userId,
    input: request.validated.body,
  });
  response.status(200).json(new ApiResponse({ message: 'Offline payment review saved.', data: { payment } }));
});

export const createRefund = asyncHandler(async (request, response) => {
  const payment = await refundPayment({
    paymentId: request.validated.params.paymentId,
    reviewerId: request.auth.userId,
    input: request.validated.body,
  });
  response.status(200).json(new ApiResponse({ message: 'Refund request recorded.', data: { payment } }));
});

export const getBillingResources = asyncHandler(async (request, response) => {
  const items = await listBillingResources(request.validated.params.resource);
  response.status(200).json(new ApiResponse({ message: 'Billing configuration loaded.', data: { items } }));
});

export const addBillingResource = asyncHandler(async (request, response) => {
  const item = await createBillingResource({
    resource: request.validated.params.resource,
    input: request.validated.body,
    actorId: request.auth.userId,
  });
  response.status(201).json(new ApiResponse({ message: 'Billing configuration created.', data: { item } }));
});

export const editBillingResource = asyncHandler(async (request, response) => {
  const item = await updateBillingResource({
    resource: request.validated.params.resource,
    itemId: request.validated.params.itemId,
    input: request.validated.body,
    actorId: request.auth.userId,
  });
  response.status(200).json(new ApiResponse({ message: 'Billing configuration updated.', data: { item } }));
});

export const razorpayWebhook = asyncHandler(async (request, response) => {
  const result = await handleRazorpayWebhook({
    rawBody: request.body,
    signature: request.get('x-razorpay-signature') || '',
    eventIdHeader: request.get('x-razorpay-event-id') || '',
  });
  response.status(200).json({ received: true, ...result });
});

export const stripeWebhook = asyncHandler(async (request, response) => {
  const result = await handleStripeWebhook({
    rawBody: request.body,
    signature: request.get('stripe-signature') || '',
  });
  response.status(200).json({ received: true, ...result });
});
