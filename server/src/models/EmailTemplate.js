import mongoose from 'mongoose';
import {
  TEMPLATE_STATUSES,
  TEMPLATE_STATUS_VALUES,
} from '../constants/siteAdministration.js';

const emailTemplateSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 120,
    },
    name: { type: String, required: true, trim: true, maxlength: 180 },
    subject: { type: String, required: true, trim: true, maxlength: 240 },
    textBody: { type: String, required: true, trim: true, maxlength: 30000 },
    htmlBody: { type: String, trim: true, maxlength: 50000, default: '' },
    variables: { type: [String], default: [] },
    status: {
      type: String,
      enum: TEMPLATE_STATUS_VALUES,
      default: TEMPLATE_STATUSES.ACTIVE,
      index: true,
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
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

const EmailTemplate =
  mongoose.models.EmailTemplate || mongoose.model('EmailTemplate', emailTemplateSchema);

export default EmailTemplate;
