import mongoose from 'mongoose';
import {
  REVIEW_CASE_STATUSES,
  REVIEW_CASE_STATUS_VALUES,
  REVIEW_DECISION_VALUES,
  REVIEW_NOTE_VISIBILITY_VALUES,
} from '../constants/reviewConstants.js';

const reviewNoteSchema = new mongoose.Schema(
  {
    visibility: {
      type: String,
      enum: REVIEW_NOTE_VISIBILITY_VALUES,
      required: true,
    },
    body: { type: String, trim: true, minlength: 2, maxlength: 3000, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const applicationReviewSchema = new mongoose.Schema(
  {
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      unique: true,
      index: true,
    },
    assignedReviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    assignedAt: { type: Date, default: null },
    dueAt: { type: Date, default: null, index: true },
    status: {
      type: String,
      enum: REVIEW_CASE_STATUS_VALUES,
      default: REVIEW_CASE_STATUSES.OPEN,
      index: true,
    },
    checklist: {
      requiredDocumentsReviewed: { type: Boolean, default: false },
      paymentConfirmedOrWaived: { type: Boolean, default: false },
      requiredStandardsMet: { type: Boolean, default: false },
      identityDeclarationsChecked: { type: Boolean, default: false },
      registrationDataChecked: { type: Boolean, default: false },
      membershipDatesChecked: { type: Boolean, default: false },
      certificateDataChecked: { type: Boolean, default: false },
    },
    paymentWaiver: {
      waived: { type: Boolean, default: false },
      reason: { type: String, trim: true, maxlength: 1000, default: '' },
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      approvedAt: { type: Date, default: null },
    },
    requestedSections: {
      type: [{ type: String, trim: true, maxlength: 120 }],
      default: [],
      validate: {
        validator(value) {
          return value.length <= 50;
        },
        message: 'A review cannot request more than 50 sections at once.',
      },
    },
    notes: {
      type: [reviewNoteSchema],
      default: [],
      validate: {
        validator(value) {
          return value.length <= 250;
        },
        message: 'A review cannot contain more than 250 notes.',
      },
    },
    decision: {
      outcome: { type: String, enum: REVIEW_DECISION_VALUES, default: null },
      reason: { type: String, trim: true, maxlength: 1000, default: '' },
      internalNote: { type: String, trim: true, maxlength: 3000, default: '' },
      applicantVisibleNote: {
        type: String,
        trim: true,
        maxlength: 3000,
        default: '',
      },
      decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      decidedAt: { type: Date, default: null },
    },
    lastActivityAt: { type: Date, default: Date.now, index: true },
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

applicationReviewSchema.index({ assignedReviewer: 1, status: 1, dueAt: 1 });
applicationReviewSchema.index({ status: 1, lastActivityAt: -1 });

const ApplicationReview =
  mongoose.models.ApplicationReview ||
  mongoose.model('ApplicationReview', applicationReviewSchema);

export default ApplicationReview;
