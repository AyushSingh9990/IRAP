import mongoose from 'mongoose';
import {
  COURSE_REVIEW_NOTE_VISIBILITY_VALUES,
  COURSE_REVIEW_STATUSES,
  COURSE_REVIEW_STATUS_VALUES,
} from '../constants/courseConstants.js';

const reviewNoteSchema = new mongoose.Schema(
  {
    visibility: {
      type: String,
      enum: COURSE_REVIEW_NOTE_VISIBILITY_VALUES,
      required: true,
    },
    body: {
      type: String,
      trim: true,
      minlength: 2,
      maxlength: 3000,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const courseReviewSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
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
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assignedAt: { type: Date, default: null },
    dueAt: { type: Date, default: null, index: true },
    status: {
      type: String,
      enum: COURSE_REVIEW_STATUS_VALUES,
      default: COURSE_REVIEW_STATUSES.OPEN,
      index: true,
    },
    checklist: {
      curriculumReviewed: { type: Boolean, default: false },
      learningOutcomesReviewed: { type: Boolean, default: false },
      assessmentReviewed: { type: Boolean, default: false },
      facultyReviewed: { type: Boolean, default: false },
      qualityAssuranceReviewed: { type: Boolean, default: false },
      creditHoursVerified: { type: Boolean, default: false },
      publicDataChecked: { type: Boolean, default: false },
    },
    requestedFields: {
      type: [{ type: String, trim: true, maxlength: 120 }],
      default: [],
      validate: {
        validator(value) {
          return value.length <= 50;
        },
        message: 'A review cannot request more than fifty fields.',
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
      outcome: {
        type: String,
        enum: ['approved', 'rejected'],
        default: null,
      },
      reason: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: '',
      },
      internalNote: {
        type: String,
        trim: true,
        maxlength: 3000,
        default: '',
      },
      providerVisibleNote: {
        type: String,
        trim: true,
        maxlength: 3000,
        default: '',
      },
      decidedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
      decidedAt: { type: Date, default: null },
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
      index: true,
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

courseReviewSchema.index({
  assignedReviewer: 1,
  status: 1,
  dueAt: 1,
});
courseReviewSchema.index({ status: 1, lastActivityAt: -1 });

const CourseReview =
  mongoose.models.CourseReview ||
  mongoose.model('CourseReview', courseReviewSchema);

export default CourseReview;
