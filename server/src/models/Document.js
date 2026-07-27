import mongoose from 'mongoose';
import { DOCUMENT_CATEGORY_VALUES } from '../constants/documentCategories.js';
import {
  DOCUMENT_REVIEW_STATUSES,
  DOCUMENT_REVIEW_STATUS_VALUES,
} from '../constants/documentStatuses.js';
import { APPLICATION_TYPE_VALUES } from '../constants/applicationTypes.js';

const reviewHistorySchema = new mongoose.Schema(
  {
    previousStatus: {
      type: String,
      enum: DOCUMENT_REVIEW_STATUS_VALUES,
      default: null,
    },
    newStatus: {
      type: String,
      enum: DOCUMENT_REVIEW_STATUS_VALUES,
      required: true,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    internalNote: { type: String, trim: true, maxlength: 2000, default: '' },
    applicantVisibleNote: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    reason: { type: String, trim: true, maxlength: 1000, default: '' },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const documentSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      index: true,
    },
    applicationType: {
      type: String,
      enum: APPLICATION_TYPE_VALUES,
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: DOCUMENT_CATEGORY_VALUES,
      required: true,
      index: true,
    },
    title: { type: String, trim: true, minlength: 2, maxlength: 160, required: true },
    originalFilename: { type: String, trim: true, maxlength: 255, required: true },
    storageProvider: {
      type: String,
      enum: ['local', 'cloudinary'],
      required: true,
      index: true,
    },
    storageKey: { type: String, required: true, unique: true, select: false },
    providerAssetId: { type: String, trim: true, default: '', select: false },
    providerSecureUrl: { type: String, trim: true, default: '', select: false },
    resourceType: { type: String, default: 'raw', select: false },
    deliveryType: { type: String, default: 'private', select: false },
    format: { type: String, trim: true, maxlength: 20, required: true },
    mimeType: { type: String, trim: true, maxlength: 150, required: true },
    extension: { type: String, trim: true, maxlength: 20, required: true },
    sizeBytes: { type: Number, min: 1, required: true },
    checksumSha256: {
      type: String,
      minlength: 64,
      maxlength: 64,
      required: true,
      select: false,
    },
    reviewStatus: {
      type: String,
      enum: DOCUMENT_REVIEW_STATUS_VALUES,
      default: DOCUMENT_REVIEW_STATUSES.PENDING,
      index: true,
    },
    reviewHistory: {
      type: [reviewHistorySchema],
      default: [],
      validate: {
        validator(value) {
          return value.length <= 100;
        },
        message: 'Document review history cannot exceed 100 entries.',
      },
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: { type: Date, default: null },
    applicantVisibleNote: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    internalNote: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
      select: false,
    },
    expiryDate: { type: Date, default: null, index: true },
    replaces: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      default: null,
    },
    replacedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      default: null,
    },
    isCurrent: { type: Boolean, default: true, index: true },
    deletedAt: { type: Date, default: null, index: true },
  },
  {
    timestamps: true,
    minimize: false,
    toJSON: {
      transform(_document, returned) {
        returned.id = returned._id?.toString();
        delete returned._id;
        delete returned.__v;
        delete returned.storageKey;
        delete returned.providerAssetId;
        delete returned.providerSecureUrl;
        delete returned.resourceType;
        delete returned.deliveryType;
        delete returned.checksumSha256;
        delete returned.internalNote;
        if (Array.isArray(returned.reviewHistory)) {
          returned.reviewHistory = returned.reviewHistory.map((entry) => {
            const safeEntry = { ...entry };
            delete safeEntry.internalNote;
            return safeEntry;
          });
        }
        return returned;
      },
    },
  },
);

documentSchema.index({ owner: 1, application: 1, isCurrent: 1, createdAt: -1 });
documentSchema.index({ application: 1, category: 1, isCurrent: 1 });
documentSchema.index({ reviewStatus: 1, createdAt: 1 });
documentSchema.index({ deletedAt: 1, isCurrent: 1 });

const Document =
  mongoose.models.Document || mongoose.model('Document', documentSchema);

export default Document;
