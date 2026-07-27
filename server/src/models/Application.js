import mongoose from 'mongoose';
import {
  APPLICATION_STATUS_VALUES,
  APPLICATION_STATUSES,
} from '../constants/applicationStatuses.js';
import { APPLICATION_TYPE_VALUES } from '../constants/applicationTypes.js';
import { APPLICATION_PURPOSES, APPLICATION_PURPOSE_VALUES } from '../constants/applicationPurposes.js';

const statusHistorySchema = new mongoose.Schema(
  {
    previousStatus: { type: String, enum: APPLICATION_STATUS_VALUES, default: null },
    newStatus: { type: String, enum: APPLICATION_STATUS_VALUES, required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    internalNote: { type: String, trim: true, maxlength: 2000, default: '' },
    applicantVisibleNote: { type: String, trim: true, maxlength: 2000, default: '' },
    reason: { type: String, trim: true, maxlength: 1000, default: '' },
    relatedDocument: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', default: null },
    relatedPayment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
    ipAddress: { type: String, trim: true, maxlength: 128, default: '' },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const stepSchema = new mongoose.Schema(
  {
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    completionPercentage: { type: Number, min: 0, max: 100, default: 0 },
    completedAt: { type: Date, default: null },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const applicationSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: { type: String, enum: APPLICATION_TYPE_VALUES, required: true, index: true },
    purpose: {
      type: String,
      enum: APPLICATION_PURPOSE_VALUES,
      default: APPLICATION_PURPOSES.INITIAL,
      index: true,
    },
    membership: { type: mongoose.Schema.Types.ObjectId, ref: 'Membership', default: null, index: true },
    previousApplication: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', default: null },
    renewalCycle: { type: Number, min: 0, default: 0 },
    reference: { type: String, required: true, unique: true, index: true, uppercase: true },
    status: {
      type: String,
      enum: APPLICATION_STATUS_VALUES,
      default: APPLICATION_STATUSES.DRAFT,
      index: true,
    },
    isCurrent: { type: Boolean, default: true, index: true },
    currentStep: { type: String, trim: true, maxlength: 80, default: '' },
    completionPercentage: { type: Number, min: 0, max: 100, default: 0 },
    steps: {
      type: Map,
      of: stepSchema,
      default: {},
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
      validate: {
        validator(value) {
          return value.length <= 100;
        },
        message: 'Application status history cannot exceed 100 entries.',
      },
    },
    submittedAt: { type: Date, default: null },
    withdrawnAt: { type: Date, default: null },
    lastSavedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    minimize: false,
    toJSON: {
      flattenMaps: true,
      transform(_document, returned) {
        returned.id = returned._id?.toString();
        delete returned._id;
        delete returned.__v;
        if (Array.isArray(returned.statusHistory)) {
          returned.statusHistory = returned.statusHistory.map((entry) => {
            const safeEntry = { ...entry };
            delete safeEntry.internalNote;
            delete safeEntry.ipAddress;
            return safeEntry;
          });
        }
        return returned;
      },
    },
  },
);

applicationSchema.index(
  { owner: 1, type: 1, isCurrent: 1 },
  {
    unique: true,
    partialFilterExpression: { isCurrent: true },
  },
);
applicationSchema.index({ owner: 1, status: 1, updatedAt: -1 });
applicationSchema.index({ type: 1, purpose: 1, status: 1, submittedAt: 1 });

const Application =
  mongoose.models.Application || mongoose.model('Application', applicationSchema);

export default Application;
