import mongoose from 'mongoose';
import {
  TEMPLATE_STATUSES,
  TEMPLATE_STATUS_VALUES,
} from '../constants/siteAdministration.js';

const certificateTemplateSchema = new mongoose.Schema(
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
    certificateType: {
      type: String,
      enum: ['member', 'training_provider', 'organization', 'course'],
      required: true,
      unique: true,
      index: true,
    },
    heading: { type: String, required: true, trim: true, maxlength: 220 },
    confirmationText: { type: String, trim: true, maxlength: 600, default: '' },
    footerText: { type: String, trim: true, maxlength: 600, default: '' },
    accentHex: {
      type: String,
      trim: true,
      maxlength: 7,
      default: '#195267',
      validate: /^#[0-9A-Fa-f]{6}$/,
    },
    signatoryName: { type: String, trim: true, maxlength: 180, default: '' },
    signatoryTitle: { type: String, trim: true, maxlength: 180, default: '' },
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

const CertificateTemplate =
  mongoose.models.CertificateTemplate ||
  mongoose.model('CertificateTemplate', certificateTemplateSchema);

export default CertificateTemplate;
