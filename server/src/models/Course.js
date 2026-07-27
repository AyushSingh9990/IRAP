import mongoose from 'mongoose';
import {
  COURSE_CREDIT_UNIT_VALUES,
  COURSE_DELIVERY_METHOD_VALUES,
  COURSE_STATUSES,
  COURSE_STATUS_VALUES,
} from '../constants/courseConstants.js';

const statusHistorySchema = new mongoose.Schema(
  {
    previousStatus: {
      type: String,
      enum: COURSE_STATUS_VALUES,
      default: null,
    },
    newStatus: {
      type: String,
      enum: COURSE_STATUS_VALUES,
      required: true,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    providerVisibleNote: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: '',
    },
    internalNote: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: '',
    },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const instructorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 160,
    },
    qualifications: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    biography: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
  },
  { _id: true },
);

const courseSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    providerMembership: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Membership',
      required: true,
      index: true,
    },
    reference: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 100,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 240,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 160,
      index: true,
    },
    summary: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      maxlength: 10000,
      default: '',
    },
    learningObjectives: {
      type: [{ type: String, trim: true, minlength: 2, maxlength: 500 }],
      default: [],
      validate: {
        validator(value) {
          return value.length <= 30;
        },
        message: 'A course cannot contain more than thirty learning objectives.',
      },
    },
    targetAudience: {
      type: [{ type: String, trim: true, minlength: 2, maxlength: 300 }],
      default: [],
      validate: {
        validator(value) {
          return value.length <= 30;
        },
        message: 'A course cannot contain more than thirty target-audience entries.',
      },
    },
    prerequisites: {
      type: [{ type: String, trim: true, maxlength: 300 }],
      default: [],
      validate: {
        validator(value) {
          return value.length <= 30;
        },
        message: 'A course cannot contain more than thirty prerequisites.',
      },
    },
    deliveryMethods: {
      type: [{ type: String, enum: COURSE_DELIVERY_METHOD_VALUES }],
      default: [],
      validate: {
        validator(value) {
          return (
            Array.isArray(value) &&
            value.length <= 3 &&
            new Set(value).size === value.length
          );
        },
        message: 'Delivery methods must be unique.',
      },
    },
    language: {
      type: String,
      trim: true,
      maxlength: 80,
      default: '',
    },
    totalLearningHours: {
      type: Number,
      min: 0.5,
      max: 10000,
      default: null,
    },
    creditHours: {
      type: Number,
      min: 0.5,
      max: 10000,
      default: null,
    },
    creditUnit: {
      type: String,
      enum: COURSE_CREDIT_UNIT_VALUES,
      default: null,
    },
    assessmentMethod: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: '',
    },
    qualityAssurance: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: '',
    },
    instructors: {
      type: [instructorSchema],
      default: [],
      validate: {
        validator(value) {
          return value.length <= 50;
        },
        message: 'A course cannot contain more than fifty instructors.',
      },
    },
    scheduleText: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: '',
    },
    priceMinor: {
      type: Number,
      min: 0,
      max: 1000000000,
      default: null,
    },
    currency: {
      type: String,
      trim: true,
      uppercase: true,
      minlength: 3,
      maxlength: 3,
      default: 'INR',
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 254,
      default: '',
    },
    websiteUrl: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    publicVisible: {
      type: Boolean,
      default: true,
    },
    declarationAccepted: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: COURSE_STATUS_VALUES,
      default: COURSE_STATUSES.DRAFT,
      index: true,
    },
    completionPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    accreditationNumber: {
      type: String,
      uppercase: true,
      trim: true,
      maxlength: 120,
      default: '',
      index: true,
    },
    validFrom: { type: Date, default: null, index: true },
    validUntil: { type: Date, default: null, index: true },
    currentCertificate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseCertificate',
      default: null,
    },
    submittedAt: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    suspendedAt: { type: Date, default: null },
    suspendedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    revokedAt: { type: Date, default: null },
    revokedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
      validate: {
        validator(value) {
          return value.length <= 150;
        },
        message: 'Course status history cannot exceed 150 entries.',
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

        if (Array.isArray(returned.statusHistory)) {
          returned.statusHistory = returned.statusHistory.map((entry) => {
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

courseSchema.index({ owner: 1, updatedAt: -1 });
courseSchema.index({ providerMembership: 1, status: 1, updatedAt: -1 });
courseSchema.index({ status: 1, submittedAt: 1 });
courseSchema.index({ category: 1, status: 1 });

const Course =
  mongoose.models.Course || mongoose.model('Course', courseSchema);

export default Course;
