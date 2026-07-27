import mongoose from 'mongoose';
import {
  CONTENT_PAGE_STATUSES,
  CONTENT_PAGE_STATUS_VALUES,
} from '../constants/siteAdministration.js';

const contentSectionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true, maxlength: 100 },
    heading: { type: String, trim: true, maxlength: 220, default: '' },
    body: { type: String, trim: true, maxlength: 12000, default: '' },
    callToActionLabel: { type: String, trim: true, maxlength: 120, default: '' },
    callToActionUrl: { type: String, trim: true, maxlength: 500, default: '' },
    order: { type: Number, min: 0, max: 1000, default: 100 },
    enabled: { type: Boolean, default: true },
  },
  { _id: false },
);

const contentPageSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 160,
    },
    title: { type: String, required: true, trim: true, maxlength: 220 },
    eyebrow: { type: String, trim: true, maxlength: 120, default: '' },
    summary: { type: String, trim: true, maxlength: 1000, default: '' },
    body: { type: String, trim: true, maxlength: 50000, default: '' },
    sections: { type: [contentSectionSchema], default: [] },
    seoTitle: { type: String, trim: true, maxlength: 70, default: '' },
    seoDescription: { type: String, trim: true, maxlength: 180, default: '' },
    status: {
      type: String,
      enum: CONTENT_PAGE_STATUS_VALUES,
      default: CONTENT_PAGE_STATUSES.DRAFT,
      index: true,
    },
    publishedAt: { type: Date, default: null, index: true },
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

contentPageSchema.index({ status: 1, publishedAt: -1 });

const ContentPage =
  mongoose.models.ContentPage || mongoose.model('ContentPage', contentPageSchema);

export default ContentPage;
