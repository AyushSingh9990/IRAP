import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  addBillingResource,
  confirmRazorpay,
  createOffline,
  createQuote,
  createRefund,
  downloadReceipt,
  editBillingResource,
  getBillingResources,
  getMyPayment,
  getMyPayments,
  getPaymentQueue,
  getPlans,
  initialize,
  reviewOffline,
  syncStripe,
} from '../controllers/payment.controller.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorizePermissions } from '../middlewares/authorize.js';
import { requireAuthenticationService } from '../middlewares/requireDatabase.js';
import { validate } from '../middlewares/validate.js';
import {
  billingResourceSchema,
  createBillingResourceSchemas,
  initializePaymentSchema,
  listPlansSchema,
  offlinePaymentSchema,
  offlineReviewSchema,
  paymentIdSchema,
  paymentReviewQueueSchema,
  quotePaymentSchema,
  razorpayConfirmationSchema,
  refundSchema,
  stripeSyncSchema,
  updateBillingResourceSchemas,
} from '../schemas/payment.schema.js';

const router = Router();

const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, message: 'Too many payment attempts. Please try again later.', errors: [] },
});

function validateResourceCreate(request, response, next) {
  const schema = createBillingResourceSchemas[request.params.resource];
  if (!schema) return validate(billingResourceSchema)(request, response, next);
  return validate(schema)(request, response, next);
}

function validateResourceUpdate(request, response, next) {
  const schema = updateBillingResourceSchemas[request.params.resource];
  if (!schema) return validate(billingResourceSchema)(request, response, next);
  return validate(schema)(request, response, next);
}

router.use(requireAuthenticationService);
router.use(authenticate);
router.get(
  '/plans',
  authorizePermissions(PERMISSIONS.PAYMENT_READ_SELF),
  validate(listPlansSchema),
  getPlans,
);

router.get('/history', authorizePermissions(PERMISSIONS.PAYMENT_READ_SELF), getMyPayments);
router.post('/quote', authorizePermissions(PERMISSIONS.PAYMENT_CREATE_SELF), validate(quotePaymentSchema), createQuote);
router.post('/initialize', authorizePermissions(PERMISSIONS.PAYMENT_CREATE_SELF), paymentLimiter, validate(initializePaymentSchema), initialize);
router.post('/verify/razorpay', authorizePermissions(PERMISSIONS.PAYMENT_CREATE_SELF), validate(razorpayConfirmationSchema), confirmRazorpay);
router.post('/sync/stripe', authorizePermissions(PERMISSIONS.PAYMENT_CREATE_SELF), validate(stripeSyncSchema), syncStripe);
router.post('/offline', authorizePermissions(PERMISSIONS.PAYMENT_CREATE_SELF), paymentLimiter, validate(offlinePaymentSchema), createOffline);

router.get('/admin/payments', authorizePermissions(PERMISSIONS.PAYMENT_MANAGE), validate(paymentReviewQueueSchema), getPaymentQueue);
router.patch('/admin/payments/:paymentId/offline-review', authorizePermissions(PERMISSIONS.PAYMENT_MANAGE), validate(offlineReviewSchema), reviewOffline);
router.post('/admin/payments/:paymentId/refunds', authorizePermissions(PERMISSIONS.PAYMENT_MANAGE), validate(refundSchema), createRefund);
router.get('/admin/config/:resource', authorizePermissions(PERMISSIONS.PAYMENT_MANAGE), validate(billingResourceSchema), getBillingResources);
router.post('/admin/config/:resource', authorizePermissions(PERMISSIONS.PAYMENT_MANAGE), validateResourceCreate, addBillingResource);
router.patch('/admin/config/:resource/:itemId', authorizePermissions(PERMISSIONS.PAYMENT_MANAGE), validateResourceUpdate, editBillingResource);

router.get('/:paymentId/receipt', validate(paymentIdSchema), downloadReceipt);
router.get('/:paymentId', validate(paymentIdSchema), getMyPayment);

export default router;
