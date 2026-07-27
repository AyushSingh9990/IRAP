import mongoose from 'mongoose';
import {
  NOTIFICATION_CATEGORY_VALUES,
  NOTIFICATION_EMAIL_STATUSES,
  NOTIFICATION_EMAIL_STATUS_VALUES,
  NOTIFICATION_TYPE_VALUES,
} from '../constants/notificationConstants.js';

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPE_VALUES,
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: NOTIFICATION_CATEGORY_VALUES,
      required: true,
      index: true,
    },
    title: { type: String, trim: true, minlength: 2, maxlength: 160, required: true },
    message: { type: String, trim: true, minlength: 2, maxlength: 1000, required: true },
    actionUrl: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
      validate: {
        validator(value) {
          return !value || /^\/(?!\/)[^\s]*$/.test(value);
        },
        message: 'Notification actions must use a local relative path.',
      },
    },
    application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', default: null },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
    document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', default: null },
    membership: { type: mongoose.Schema.Types.ObjectId, ref: 'Membership', default: null },
    certificate: { type: mongoose.Schema.Types.ObjectId, ref: 'Certificate', default: null },
    reference: { type: String, trim: true, maxlength: 160, default: '' },
    dedupeKey: { type: String, trim: true, maxlength: 255, default: null },
    readAt: { type: Date, default: null, index: true },
    archivedAt: { type: Date, default: null, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    emailStatus: {
      type: String,
      enum: NOTIFICATION_EMAIL_STATUS_VALUES,
      default: NOTIFICATION_EMAIL_STATUSES.NOT_REQUESTED,
    },
    emailFailureMessage: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
      select: false,
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
        delete returned.emailFailureMessage;
        return returned;
      },
    },
  },
);

notificationSchema.index({ recipient: 1, archivedAt: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, readAt: 1, createdAt: -1 });
notificationSchema.index(
  { recipient: 1, dedupeKey: 1 },
  {
    unique: true,
    partialFilterExpression: { dedupeKey: { $type: 'string' } },
  },
);

const Notification =
  mongoose.models.Notification || mongoose.model('Notification', notificationSchema);

export default Notification;
