import mongoose from 'mongoose';
import {
  COMPLAINT_PRIORITIES,
  COMPLAINT_PRIORITY_VALUES,
  SUPPORT_STATUSES,
  SUPPORT_STATUS_VALUES,
} from '../constants/siteAdministration.js';

const complaintSchema = new mongoose.Schema(
  {
    reference: { type: String, required: true, unique: true, trim: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 180 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    telephone: { type: String, trim: true, maxlength: 30, default: '' },
    subject: { type: String, required: true, trim: true, maxlength: 220 },
    message: { type: String, required: true, trim: true, maxlength: 12000 },
    relatedReference: { type: String, trim: true, maxlength: 160, default: '' },
    priority: {
      type: String,
      enum: COMPLAINT_PRIORITY_VALUES,
      default: COMPLAINT_PRIORITIES.NORMAL,
      index: true,
    },
    status: {
      type: String,
      enum: SUPPORT_STATUS_VALUES,
      default: SUPPORT_STATUSES.NEW,
      index: true,
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    internalNotes: { type: String, trim: true, maxlength: 10000, default: '' },
    responseSummary: { type: String, trim: true, maxlength: 5000, default: '' },
    lastResponseAt: { type: Date, default: null },
    submittedIp: { type: String, trim: true, maxlength: 128, default: '' },
    userAgent: { type: String, trim: true, maxlength: 500, default: '' },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_document, returned) {
        returned.id = returned._id?.toString();
        delete returned._id;
        delete returned.__v;
        delete returned.submittedIp;
        delete returned.userAgent;
        return returned;
      },
    },
  },
);

complaintSchema.index({ status: 1, priority: 1, createdAt: -1 });
complaintSchema.index({ name: 'text', email: 'text', subject: 'text', message: 'text' });

const Complaint =
  mongoose.models.Complaint || mongoose.model('Complaint', complaintSchema);

export default Complaint;
