import mongoose from 'mongoose';
import { SITE_SETTING_GROUP_VALUES } from '../constants/siteAdministration.js';

const siteSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 120,
    },
    group: {
      type: String,
      enum: SITE_SETTING_GROUP_VALUES,
      required: true,
      index: true,
    },
    label: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 600, default: '' },
    value: { type: mongoose.Schema.Types.Mixed, default: null },
    valueType: {
      type: String,
      enum: ['string', 'number', 'boolean', 'string_array', 'json'],
      default: 'string',
    },
    public: { type: Boolean, default: false, index: true },
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

siteSettingSchema.index({ group: 1, key: 1 });

const SiteSetting =
  mongoose.models.SiteSetting || mongoose.model('SiteSetting', siteSettingSchema);

export default SiteSetting;
