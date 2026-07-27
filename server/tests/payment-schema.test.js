import { describe, expect, it } from 'vitest';
import { getEffectivePermissions, PERMISSIONS } from '../src/constants/permissions.js';
import { ROLES } from '../src/constants/roles.js';
import {
  createBillingResourceSchemas,
  initializePaymentSchema,
  offlineReviewSchema,
  quotePaymentSchema,
} from '../src/schemas/payment.schema.js';

const objectId = '507f1f77bcf86cd799439011';

describe('payment schemas and permissions', () => {
  it('grants applicants self-service payment permissions', () => {
    const permissions = getEffectivePermissions([ROLES.APPLICANT]);
    expect(permissions).toContain(PERMISSIONS.PAYMENT_CREATE_SELF);
    expect(permissions).toContain(PERMISSIONS.PAYMENT_READ_SELF);
    expect(permissions).not.toContain(PERMISSIONS.PAYMENT_MANAGE);
  });

  it('accepts a valid payment quote request', () => {
    const result = quotePaymentSchema.safeParse({
      body: {
        applicationId: objectId,
        planId: objectId,
        couponCode: '',
        billingCountry: 'IN',
        billingState: 'DL',
      },
      params: {},
      query: {},
    });
    expect(result.success).toBe(true);
  });

  it('rejects offline provider in the online initializer', () => {
    const result = initializePaymentSchema.safeParse({
      body: {
        applicationId: objectId,
        planId: objectId,
        couponCode: '',
        provider: 'offline',
        idempotencyKey: '1234567890abcdef',
        billing: {
          fullName: 'Ayush Singh',
          email: 'ayush@example.com',
          phone: '',
          addressLine1: '',
          addressLine2: '',
          city: 'Delhi',
          state: 'Delhi',
          postalCode: '110001',
          countryCode: 'IN',
        },
      },
      params: {},
      query: {},
    });
    expect(result.success).toBe(false);
  });

  it('requires a meaningful finance note for offline review', () => {
    const result = offlineReviewSchema.safeParse({
      body: { action: 'reject', note: '', internalNote: '' },
      params: { paymentId: objectId },
      query: {},
    });
    expect(result.success).toBe(false);
  });
  it('accepts a valid online payment initializer', () => {
    const result = initializePaymentSchema.safeParse({
      body: {
        applicationId: objectId,
        planId: objectId,
        couponCode: '',
        provider: 'razorpay',
        idempotencyKey: 'razorpay-1234567890abcdef',
        billing: {
          fullName: 'Ayush Singh',
          email: 'ayush@example.com',
          phone: '',
          addressLine1: '',
          addressLine2: '',
          city: 'Delhi',
          state: 'Delhi',
          postalCode: '110001',
          countryCode: 'IN',
        },
      },
      params: {},
      query: {},
    });
    expect(result.success).toBe(true);
  });

  it('rejects a percentage coupon above one hundred percent', () => {
    const result = createBillingResourceSchemas.coupons.safeParse({
      body: {
        code: 'INVALID_PERCENT',
        description: '',
        type: 'percentage',
        value: 101,
        currency: '',
        planIds: [],
        applicationTypes: [],
        minimumSubtotalMinor: 0,
        maximumDiscountMinor: 0,
        validFrom: null,
        validUntil: null,
        usageLimit: 0,
        perUserLimit: 1,
        active: true,
      },
      params: { resource: 'coupons' },
      query: {},
    });
    expect(result.success).toBe(false);
  });

  it('requires a billing purpose on new plans', () => {
    const result = createBillingResourceSchemas.plans.safeParse({
      body: {
        code: 'RENEWAL_MEMBER',
        name: 'Membership renewal',
        description: '',
        applicationTypes: ['member'],
        purposes: ['renewal'],
        amountMinor: 10000,
        currency: 'INR',
        features: [],
        active: true,
        sortOrder: 100,
      },
      params: { resource: 'plans' },
      query: {},
    });
    expect(result.success).toBe(true);
  });

});
