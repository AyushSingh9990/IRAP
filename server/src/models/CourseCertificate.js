import mongoose from 'mongoose';
import {
  COURSE_CERTIFICATE_STATUSES,
  COURSE_CERTIFICATE_STATUS_VALUES,
  COURSE_CREDIT_UNIT_VALUES,
} from '../constants/courseConstants.js';

const statusHistorySchema = new mongoose.Schema(
  {
    previousStatus: {
      type: String,
      enum: COURSE_CERTIFICATE_STATUS_VALUES,
      default: null,
    },
    newStatus: {
      type: String,
      enum: COURSE_CERTIFICATE_STATUS_VALUES,
      required: true,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
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

const courseCertificateSchema = new mongoose.Schema(
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
    providerMembership: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Membership',
      required: true,
      index: true,
    },
    certificateNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 120,
      index: true,
    },
    accreditationNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 120,
      index: true,
    },
    verificationCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 20,
      maxlength: 80,
      index: true,
    },
    verificationUrl: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    courseTitle: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 240,
    },
    providerName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 240,
    },
    creditHours: {
      type: Number,
      required: true,
      min: 0.5,
      max: 10000,
    },
    creditUnit: {
      type: String,
      enum: COURSE_CREDIT_UNIT_VALUES,
      required: true,
    },
    issueDate: {
      type: Date,
      required: true,
    },
    expiryDate: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: COURSE_CERTIFICATE_STATUS_VALUES,
      default: COURSE_CERTIFICATE_STATUSES.ACTIVE,
      required: true,
      index: true,
    },
    authorizedSignatory: {
      name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 160,
      },
      title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 160,
      },
    },
    replaces: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseCertificate',
      default: null,
    },
    replacedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseCertificate',
      default: null,
    },
    revokedAt: { type: Date, default: null },
    revokedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    revocationReason: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
      validate: {
        validator(value) {
          return value.length <= 100;
        },
        message: 'Course-certificate history cannot exceed 100 entries.',
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

courseCertificateSchema.index({
  course: 1,
  issueDate: -1,
});
courseCertificateSchema.index({
  owner: 1,
  status: 1,
  issueDate: -1,
});

const CourseCertificate =
  mongoose.models.CourseCertificate ||
  mongoose.model('CourseCertificate', courseCertificateSchema);

export default CourseCertificate;
