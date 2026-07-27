import mongoose from 'mongoose';
import { APPLICATION_TYPE_VALUES } from '../constants/applicationTypes.js';
import {
  MEMBERSHIP_PAYMENT_STATUS_VALUES,
  MEMBERSHIP_STATUSES,
  MEMBERSHIP_STATUS_VALUES,
} from '../constants/membershipConstants.js';

const statusHistorySchema = new mongoose.Schema(
  {
    previousStatus: { type: String, enum: MEMBERSHIP_STATUS_VALUES, default: null },
    newStatus: { type: String, enum: MEMBERSHIP_STATUS_VALUES, required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reason: { type: String, trim: true, maxlength: 1000, default: '' },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const reminderHistorySchema = new mongoose.Schema(
  {
    cycle: { type: Number, required: true, min: 0 },
    daysBeforeExpiry: { type: Number, required: true, min: 0, max: 365 },
    sentAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const renewalHistorySchema = new mongoose.Schema(
  {
    application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true },
    previousValidUntil: { type: Date, required: true },
    newValidUntil: { type: Date, required: true },
    paymentStatus: {
      type: String,
      enum: MEMBERSHIP_PAYMENT_STATUS_VALUES,
      required: true,
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    approvedAt: { type: Date, required: true },
    certificate: { type: mongoose.Schema.Types.ObjectId, ref: 'Certificate', required: true },
  },
  { _id: true },
);

const membershipSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      unique: true,
      index: true,
    },
    currentApplication: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      index: true,
    },
    type: { type: String, enum: APPLICATION_TYPE_VALUES, required: true, index: true },
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      uppercase: true,
      trim: true,
      maxlength: 80,
    },
    approvedName: { type: String, required: true, trim: true, minlength: 2, maxlength: 240 },
    status: {
      type: String,
      enum: MEMBERSHIP_STATUS_VALUES,
      required: true,
      default: MEMBERSHIP_STATUSES.ACTIVE,
      index: true,
    },
    validFrom: { type: Date, required: true, index: true },
    validUntil: { type: Date, required: true, index: true },
    renewalOpensAt: { type: Date, required: true, index: true },
    graceEndsAt: { type: Date, required: true, index: true },
    renewalDate: { type: Date, required: true },
    paymentStatus: {
      type: String,
      enum: MEMBERSHIP_PAYMENT_STATUS_VALUES,
      required: true,
    },
    approvalDate: { type: Date, required: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    directoryVisible: { type: Boolean, default: false, index: true },
    currentCertificate: { type: mongoose.Schema.Types.ObjectId, ref: 'Certificate', default: null },
    renewalCycle: { type: Number, min: 0, default: 0 },
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
      validate: {
        validator(value) {
          return value.length <= 150;
        },
        message: 'Membership status history cannot exceed 150 entries.',
      },
    },
    renewalHistory: {
      type: [renewalHistorySchema],
      default: [],
      validate: {
        validator(value) {
          return value.length <= 100;
        },
        message: 'Membership renewal history cannot exceed 100 entries.',
      },
    },
    reminderHistory: {
      type: [reminderHistorySchema],
      default: [],
      validate: {
        validator(value) {
          return value.length <= 300;
        },
        message: 'Membership reminder history cannot exceed 300 entries.',
      },
    },
    suspendedAt: { type: Date, default: null },
    suspendedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    suspensionReason: { type: String, trim: true, maxlength: 1000, default: '' },
    revokedAt: { type: Date, default: null },
    revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    revocationReason: { type: String, trim: true, maxlength: 1000, default: '' },
  },
  {
    timestamps: true,
    minimize: false,
    toJSON: {
      transform(_document, returned) {
        returned.id = returned._id?.toString();
        delete returned._id;
        delete returned.__v;
        return returned;
      },
    },
  },
);

membershipSchema.index({ owner: 1, type: 1 }, { unique: true });
membershipSchema.index({ status: 1, validUntil: 1 });
membershipSchema.index({ type: 1, directoryVisible: 1, status: 1 });

const Membership =
  mongoose.models.Membership || mongoose.model('Membership', membershipSchema);

export default Membership;
