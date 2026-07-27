import mongoose from 'mongoose';
import { APPLICATION_TYPE_VALUES } from '../constants/applicationTypes.js';
import {
  CERTIFICATE_STATUSES,
  CERTIFICATE_STATUS_VALUES,
} from '../constants/membershipConstants.js';

const statusHistorySchema = new mongoose.Schema(
  {
    previousStatus: { type: String, enum: CERTIFICATE_STATUS_VALUES, default: null },
    newStatus: { type: String, enum: CERTIFICATE_STATUS_VALUES, required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reason: { type: String, trim: true, maxlength: 1000, default: '' },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const certificateSchema = new mongoose.Schema(
  {
    membership: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Membership',
      required: true,
      index: true,
    },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true },
    certificateNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      uppercase: true,
      trim: true,
      maxlength: 100,
    },
    registrationNumber: {
      type: String,
      required: true,
      index: true,
      uppercase: true,
      trim: true,
      maxlength: 80,
    },
    verificationCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      minlength: 20,
      maxlength: 80,
    },
    verificationUrl: { type: String, required: true, trim: true, maxlength: 500 },
    type: { type: String, enum: APPLICATION_TYPE_VALUES, required: true, index: true },
    certificateTitle: { type: String, required: true, trim: true, maxlength: 200 },
    holderName: { type: String, required: true, trim: true, minlength: 2, maxlength: 240 },
    issueDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: CERTIFICATE_STATUS_VALUES,
      required: true,
      default: CERTIFICATE_STATUSES.ACTIVE,
      index: true,
    },
    authorizedSignatory: {
      name: { type: String, required: true, trim: true, maxlength: 160 },
      title: { type: String, required: true, trim: true, maxlength: 160 },
    },
    generationVersion: { type: Number, required: true, min: 1, default: 1 },
    replaces: { type: mongoose.Schema.Types.ObjectId, ref: 'Certificate', default: null },
    replacedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Certificate', default: null },
    revokedAt: { type: Date, default: null },
    revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    revocationReason: { type: String, trim: true, maxlength: 1000, default: '' },
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
      validate: {
        validator(value) {
          return value.length <= 100;
        },
        message: 'Certificate status history cannot exceed 100 entries.',
      },
    },
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

certificateSchema.index({ membership: 1, issueDate: -1 });
certificateSchema.index({ owner: 1, status: 1, issueDate: -1 });
certificateSchema.index({ registrationNumber: 1, status: 1 });

const Certificate =
  mongoose.models.Certificate || mongoose.model('Certificate', certificateSchema);

export default Certificate;
