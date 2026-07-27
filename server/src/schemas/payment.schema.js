import { z } from 'zod';
import { APPLICATION_TYPE_VALUES } from '../constants/applicationTypes.js';
import { APPLICATION_PURPOSE_VALUES } from '../constants/applicationPurposes.js';
import {
  COUPON_TYPE_VALUES,
  PAYMENT_PROVIDER_VALUES,
  PAYMENT_STATUS_VALUES,
} from '../constants/paymentConstants.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'A valid identifier is required.');
const currency = z.string().trim().length(3).transform((value) => value.toUpperCase());
const countryCode = z.string().trim().length(2).transform((value) => value.toUpperCase());
const optionalText = (max) => z.string().trim().max(max).optional().default('');
const dateString = z.string().datetime({ offset: true });

const billingSchema = z.object({
  fullName: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  phone: optionalText(30),
  addressLine1: optionalText(200),
  addressLine2: optionalText(200),
  city: optionalText(120),
  state: optionalText(120),
  postalCode: optionalText(30),
  countryCode,
});

export const listPlansSchema = z.object({
  body: z.unknown().optional(),
  params: z.object({}),
  query: z.object({
    applicationType: z.enum(APPLICATION_TYPE_VALUES).optional(),
    purpose: z.enum(APPLICATION_PURPOSE_VALUES).optional(),
  }),
});

export const quotePaymentSchema = z.object({
  body: z.object({
    applicationId: objectId,
    planId: objectId,
    couponCode: optionalText(40),
    billingCountry: countryCode,
    billingState: optionalText(120),
  }),
  params: z.object({}),
  query: z.object({}),
});

export const initializePaymentSchema = z.object({
  body: z.object({
    applicationId: objectId,
    planId: objectId,
    couponCode: optionalText(40),
    provider: z.enum(PAYMENT_PROVIDER_VALUES).refine((value) => value !== 'offline', {
      message: 'Use the offline payment form for offline payments.',
    }),
    idempotencyKey: z.string().trim().min(16).max(120),
    billing: billingSchema,
  }),
  params: z.object({}),
  query: z.object({}),
});


export const stripeSyncSchema = z.object({
  body: z.object({ paymentId: objectId }),
  params: z.object({}),
  query: z.object({}),
});

export const razorpayConfirmationSchema = z.object({
  body: z.object({
    paymentId: objectId,
    razorpayOrderId: z.string().trim().min(4).max(255),
    razorpayPaymentId: z.string().trim().min(4).max(255),
    razorpaySignature: z.string().trim().length(64),
  }),
  params: z.object({}),
  query: z.object({}),
});

export const offlinePaymentSchema = z.object({
  body: z.object({
    applicationId: objectId,
    planId: objectId,
    couponCode: optionalText(40),
    idempotencyKey: z.string().trim().min(16).max(120),
    billing: billingSchema,
    reference: z.string().trim().min(3).max(160),
    bankName: optionalText(160),
    paidAt: dateString,
    proofDocumentId: z.union([objectId, z.literal('')]).optional().default(''),
    applicantNote: optionalText(1000),
  }),
  params: z.object({}),
  query: z.object({}),
});

export const paymentIdSchema = z.object({
  body: z.unknown().optional(),
  params: z.object({ paymentId: objectId }),
  query: z.object({}),
});

export const paymentReviewQueueSchema = z.object({
  body: z.unknown().optional(),
  params: z.object({}),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(PAYMENT_STATUS_VALUES).optional(),
    provider: z.enum(PAYMENT_PROVIDER_VALUES).optional(),
    search: z.string().trim().max(120).optional().default(''),
  }),
});

export const offlineReviewSchema = z.object({
  body: z.object({
    action: z.enum(['approve', 'reject']),
    note: z.string().trim().min(3).max(1000),
    internalNote: optionalText(2000),
  }),
  params: z.object({ paymentId: objectId }),
  query: z.object({}),
});

export const refundSchema = z.object({
  body: z.object({
    amountMinor: z.coerce.number().int().min(1),
    reason: z.string().trim().min(3).max(500),
  }),
  params: z.object({ paymentId: objectId }),
  query: z.object({}),
});

const commonActiveFields = {
  active: z.boolean().optional(),
};

const planInput = z.object({
  code: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9_-]+$/),
  name: z.string().trim().min(2).max(120),
  description: optionalText(1000),
  applicationTypes: z.array(z.enum(APPLICATION_TYPE_VALUES)).min(1),
  purposes: z.array(z.enum(APPLICATION_PURPOSE_VALUES)).min(1),
  amountMinor: z.coerce.number().int().min(1).max(100_000_000),
  currency,
  features: z.array(z.string().trim().min(1).max(200)).max(20).default([]),
  active: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(10000).default(100),
});

const couponShape = {
    code: z.string().trim().min(3).max(40).regex(/^[A-Za-z0-9_-]+$/),
    description: optionalText(500),
    type: z.enum(COUPON_TYPE_VALUES),
    value: z.coerce.number().int().min(1),
    currency: z.union([currency, z.literal('')]).optional().default(''),
    planIds: z.array(objectId).default([]),
    applicationTypes: z.array(z.enum(APPLICATION_TYPE_VALUES)).default([]),
    minimumSubtotalMinor: z.coerce.number().int().min(0).default(0),
    maximumDiscountMinor: z.coerce.number().int().min(0).default(0),
    validFrom: z.union([dateString, z.null()]).optional().default(null),
    validUntil: z.union([dateString, z.null()]).optional().default(null),
    usageLimit: z.coerce.number().int().min(0).default(0),
    perUserLimit: z.coerce.number().int().min(0).default(1),
  active: z.boolean().default(true),
};

const couponInput = z.object(couponShape).superRefine((value, context) => {
    if (value.type === 'percentage' && value.value > 100) {
      context.addIssue({
        code: 'custom',
        path: ['value'],
        message: 'Percentage coupons cannot exceed 100%.',
      });
    }
    if (value.type === 'fixed' && !value.currency) {
      context.addIssue({
        code: 'custom',
        path: ['currency'],
        message: 'Currency is required for a fixed coupon.',
      });
    }
    if (
      value.validFrom &&
      value.validUntil &&
      new Date(value.validFrom) >= new Date(value.validUntil)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['validUntil'],
        message: 'Valid-until must be after valid-from.',
      });
    }
  });

const taxShape = {
    code: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9_-]+$/),
    name: z.string().trim().min(2).max(120),
    countryCode: z.union([countryCode, z.literal('')]).optional().default(''),
    stateCode: optionalText(20),
    applicationTypes: z.array(z.enum(APPLICATION_TYPE_VALUES)).default([]),
    rateBasisPoints: z.coerce.number().int().min(0).max(10000),
    inclusive: z.boolean().default(false),
    priority: z.coerce.number().int().min(0).max(10000).default(100),
    validFrom: z.union([dateString, z.null()]).optional().default(null),
    validUntil: z.union([dateString, z.null()]).optional().default(null),
  active: z.boolean().default(true),
};

const taxInput = z.object(taxShape).superRefine((value, context) => {
    if (
      value.validFrom &&
      value.validUntil &&
      new Date(value.validFrom) >= new Date(value.validUntil)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['validUntil'],
        message: 'Valid-until must be after valid-from.',
      });
    }
  });

export const billingResourceSchema = z.object({
  body: z.unknown().optional(),
  params: z.object({ resource: z.enum(['plans', 'coupons', 'taxes']) }),
  query: z.object({}),
});

export const createBillingResourceSchemas = Object.freeze({
  plans: z.object({ body: planInput, params: z.object({ resource: z.literal('plans') }), query: z.object({}) }),
  coupons: z.object({ body: couponInput, params: z.object({ resource: z.literal('coupons') }), query: z.object({}) }),
  taxes: z.object({ body: taxInput, params: z.object({ resource: z.literal('taxes') }), query: z.object({}) }),
});

export const updateBillingResourceSchemas = Object.freeze({
  plans: z.object({ body: planInput.partial().extend(commonActiveFields), params: z.object({ resource: z.literal('plans'), itemId: objectId }), query: z.object({}) }),
  coupons: z.object({ body: z.object(couponShape).partial().extend(commonActiveFields), params: z.object({ resource: z.literal('coupons'), itemId: objectId }), query: z.object({}) }),
  taxes: z.object({ body: z.object(taxShape).partial().extend(commonActiveFields), params: z.object({ resource: z.literal('taxes'), itemId: objectId }), query: z.object({}) }),
});
