import mongoose from 'mongoose';
import {
  COURSE_DOCUMENT_CATEGORY_VALUES,
} from '../constants/courseConstants.js';
import {
  DOCUMENT_REVIEW_STATUSES,
  DOCUMENT_REVIEW_STATUS_VALUES,
} from '../constants/documentStatuses.js';

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
    providerVisibleNote: {
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
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const courseDocumentSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: COURSE_DOCUMENT_CATEGORY_VALUES,
      required: true,
      index: true,
    },
    title: {
      type: String,
      trim: true,
      minlength: 2,
      maxlength: 160,
      required: true,
    },
    originalFilename: {
      type: String,
      trim: true,
      maxlength: 255,
      required: true,
    },
    storageProvider: {
      type: String,
      enum: ['local', 'cloudinary'],
      required: true,
      index: true,
    },
    storageKey: {
      type: String,
      required: true,
      unique: true,
      select: false,
    },
    providerAssetId: {
      type: String,
      trim: true,
      default: '',
      select: false,
    },
    providerSecureUrl: {
      type: String,
      trim: true,
      default: '',
      select: false,
    },
    resourceType: {
      type: String,
      default: 'raw',
      select: false,
    },
    deliveryType: {
      type: String,
      default: 'private',
      select: false,
    },
    format: {
      type: String,
      trim: true,
      maxlength: 20,
      required: true,
    },
    mimeType: {
      type: String,
      trim: true,
      maxlength: 150,
      required: true,
    },
    extension: {
      type: String,
      trim: true,
      maxlength: 20,
      required: true,
    },
    sizeBytes: {
      type: Number,
      min: 1,
      required: true,
    },
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
    providerVisibleNote: {
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
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: { type: Date, default: null },
    replaces: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseDocument',
      default: null,
    },
    replacedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseDocument',
      default: null,
    },
    isCurrent: {
      type: Boolean,
      default: true,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
    reviewHistory: {
      type: [reviewHistorySchema],
      default: [],
      validate: {
        validator(value) {
          return value.length <= 100;
        },
        message: 'Course-document history cannot exceed 100 entries.',
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
        delete returned.storageKey;
        delete returned.providerAssetId;
        delete returned.providerSecureUrl;
        delete returned.resourceType;
        delete returned.deliveryType;
        delete returned.checksumSha256;
        delete returned.internalNote;
        return returned;
      },
    },
  },
);

courseDocumentSchema.index({
  course: 1,
  category: 1,
  isCurrent: 1,
  createdAt: -1,
});
courseDocumentSchema.index({
  reviewStatus: 1,
  createdAt: 1,
});
courseDocumentSchema.index({
  owner: 1,
  course: 1,
  isCurrent: 1,
});

const CourseDocument =
  mongoose.models.CourseDocument ||
  mongoose.model('CourseDocument', courseDocumentSchema);

export default CourseDocument;
