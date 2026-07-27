import mongoose from 'mongoose';
import { APPLICATION_PURPOSES, APPLICATION_PURPOSE_VALUES } from '../constants/applicationPurposes.js';
import {
  PAYMENT_HISTORY_SOURCE_VALUES,
  PAYMENT_PROVIDER_VALUES,
  PAYMENT_STATUS_VALUES,
  PAYMENT_STATUSES,
  REFUND_STATUS_VALUES,
} from '../constants/paymentConstants.js';

const statusHistorySchema = new mongoose.Schema(
  {
    previousStatus: { type: String, enum: PAYMENT_STATUS_VALUES, default: null },
    newStatus: { type: String, enum: PAYMENT_STATUS_VALUES, required: true },
    source: { type: String, enum: PAYMENT_HISTORY_SOURCE_VALUES, required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    message: { type: String, trim: true, maxlength: 1000, default: '' },
    providerEventId: { type: String, trim: true, maxlength: 255, default: '' },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const refundSchema = new mongoose.Schema(
  {
    providerRefundId: { type: String, trim: true, maxlength: 255, default: '' },
    amountMinor: { type: Number, required: true, min: 1 },
    currency: { type: String, required: true, uppercase: true, minlength: 3, maxlength: 3 },
    status: { type: String, enum: REFUND_STATUS_VALUES, required: true },
    reason: { type: String, trim: true, maxlength: 500, default: '' },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    requestedAt: { type: Date, default: Date.now },
    processedAt: { type: Date, default: null },
    failureMessage: { type: String, trim: true, maxlength: 1000, default: '' },
  },
  { _id: true },
);

const paymentSchema = new mongoose.Schema(
  {
    reference: {
      type: String,
      required: true,
      unique: true,
      index: true,
      uppercase: true,
      trim: true,
    },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      index: true,
    },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true, index: true },
    purpose: {
      type: String,
      enum: APPLICATION_PURPOSE_VALUES,
      default: APPLICATION_PURPOSES.INITIAL,
      required: true,
      index: true,
    },
    coupon: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', default: null },
    taxRate: { type: mongoose.Schema.Types.ObjectId, ref: 'TaxRate', default: null },
    provider: { type: String, enum: PAYMENT_PROVIDER_VALUES, required: true, index: true },
    status: {
      type: String,
      enum: PAYMENT_STATUS_VALUES,
      default: PAYMENT_STATUSES.INITIALIZED,
      index: true,
    },
    idempotencyKey: { type: String, required: true, unique: true, index: true, maxlength: 120 },
    providerOrderId: { type: String, trim: true, maxlength: 255, default: '', index: true },
    providerPaymentId: { type: String, trim: true, maxlength: 255, default: '', index: true },
    providerSignatureHash: {
      type: String,
      trim: true,
      default: null,
      select: false,
      validate: {
        validator(value) {
          return (
            value === null ||
            value === undefined ||
            /^[a-f0-9]{64}$/i.test(value)
          );
        },
        message:
          'Provider signature hash must be a 64-character SHA-256 hexadecimal value.',
      },
    },
    providerCustomerId: { type: String, trim: true, maxlength: 255, default: '' },
    currency: { type: String, required: true, uppercase: true, minlength: 3, maxlength: 3 },
    subtotalMinor: { type: Number, required: true, min: 0 },
    discountMinor: { type: Number, required: true, min: 0, default: 0 },
    taxableMinor: { type: Number, required: true, min: 0 },
    taxMinor: { type: Number, required: true, min: 0, default: 0 },
    totalMinor: { type: Number, required: true, min: 0 },
    refundedMinor: { type: Number, required: true, min: 0, default: 0 },
    planSnapshot: {
      code: { type: String, required: true },
      name: { type: String, required: true },
      applicationTypes: [{ type: String }],
      purposes: [{ type: String }],
    },
    couponSnapshot: {
      code: { type: String, default: '' },
      description: { type: String, default: '' },
      type: { type: String, default: '' },
      value: { type: Number, default: 0 },
    },
    taxSnapshot: {
      code: { type: String, default: '' },
      name: { type: String, default: '' },
      rateBasisPoints: { type: Number, default: 0 },
      inclusive: { type: Boolean, default: false },
    },
    billing: {
      fullName: { type: String, trim: true, maxlength: 160, required: true },
      email: { type: String, trim: true, lowercase: true, maxlength: 254, required: true },
      phone: { type: String, trim: true, maxlength: 30, default: '' },
      addressLine1: { type: String, trim: true, maxlength: 200, default: '' },
      addressLine2: { type: String, trim: true, maxlength: 200, default: '' },
      city: { type: String, trim: true, maxlength: 120, default: '' },
      state: { type: String, trim: true, maxlength: 120, default: '' },
      postalCode: { type: String, trim: true, maxlength: 30, default: '' },
      countryCode: { type: String, trim: true, uppercase: true, minlength: 2, maxlength: 2 },
    },
    offlineDetails: {
      reference: { type: String, trim: true, uppercase: true, maxlength: 160, default: '' },
      bankName: { type: String, trim: true, maxlength: 160, default: '' },
      paidAt: { type: Date, default: null },
      proofDocument: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', default: null },
      applicantNote: { type: String, trim: true, maxlength: 1000, default: '' },
      reviewerNote: { type: String, trim: true, maxlength: 1000, default: '' },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      reviewedAt: { type: Date, default: null },
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
      validate: {
        validator(value) {
          return value.length <= 150;
        },
        message: 'Payment status history cannot exceed 150 entries.',
      },
    },
    refunds: {
      type: [refundSchema],
      default: [],
      validate: {
        validator(value) {
          return value.length <= 50;
        },
        message: 'Payment refund history cannot exceed 50 entries.',
      },
    },
    failureCode: { type: String, trim: true, maxlength: 160, default: '' },
    failureMessage: { type: String, trim: true, maxlength: 1000, default: '' },
    paidAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    receipt: { type: mongoose.Schema.Types.ObjectId, ref: 'Receipt', default: null },
    internalNote: { type: String, trim: true, maxlength: 2000, default: '', select: false },
  },
  {
    timestamps: true,
    minimize: false,
    toJSON: {
      transform(_document, returned) {
        returned.id = returned._id?.toString();
        delete returned._id;
        delete returned.__v;
        delete returned.internalNote;
        return returned;
      },
    },
  },
);

paymentSchema.index({ owner: 1, createdAt: -1 });
paymentSchema.index({ application: 1, status: 1, createdAt: -1 });
paymentSchema.index({ provider: 1, providerOrderId: 1 });
paymentSchema.index({ provider: 1, providerPaymentId: 1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index(
  { owner: 1, provider: 1, 'offlineDetails.reference': 1 },
  { unique: true, partialFilterExpression: { provider: 'offline' } },
);

const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
export default Payment;
