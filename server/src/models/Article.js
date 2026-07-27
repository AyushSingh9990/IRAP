import mongoose from 'mongoose';
import {
  ARTICLE_AUTHOR_TYPE_VALUES,
  ARTICLE_STATUSES,
  ARTICLE_STATUS_VALUES,
} from '../constants/articleConstants.js';

const featuredImageSchema = new mongoose.Schema(
  {
    storageProvider: { type: String, enum: ['local', 'cloudinary'], required: true },
    storageKey: { type: String, required: true, trim: true, maxlength: 1000 },
    providerAssetId: { type: String, trim: true, maxlength: 500, default: '' },
    providerSecureUrl: { type: String, trim: true, maxlength: 1500, default: '' },
    resourceType: { type: String, trim: true, maxlength: 60, default: 'raw' },
    deliveryType: { type: String, trim: true, maxlength: 60, default: 'private' },
    format: { type: String, trim: true, maxlength: 20, required: true },
    originalFilename: { type: String, trim: true, maxlength: 255, required: true },
    extension: { type: String, trim: true, maxlength: 20, required: true },
    mimeType: { type: String, trim: true, maxlength: 120, required: true },
    sizeBytes: { type: Number, min: 1, required: true },
    checksumSha256: { type: String, trim: true, minlength: 64, maxlength: 64, required: true },
    altText: { type: String, trim: true, maxlength: 240, default: '' },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const articleSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    authorMembership: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Membership',
      required: true,
      index: true,
    },
    authorType: {
      type: String,
      enum: ARTICLE_AUTHOR_TYPE_VALUES,
      required: true,
      index: true,
    },
    authorName: {
      type: String,
      trim: true,
      minlength: 2,
      maxlength: 240,
      required: true,
    },
    authorSlug: {
      type: String,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 180,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      required: true,
      index: true,
    },
    title: { type: String, trim: true, minlength: 3, maxlength: 240, required: true },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 260,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      default: null,
    },
    summary: { type: String, trim: true, maxlength: 600, default: '' },
    content: { type: String, trim: true, maxlength: 120000, default: '' },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ArticleCategory',
      default: null,
      index: true,
    },
    categoryName: { type: String, trim: true, maxlength: 120, default: '' },
    categorySlug: { type: String, trim: true, lowercase: true, maxlength: 140, default: '' },
    tags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ArticleTag' }],
    tagNames: [{ type: String, trim: true, maxlength: 80 }],
    tagSlugs: [{ type: String, trim: true, lowercase: true, maxlength: 100 }],
    featuredImage: { type: featuredImageSchema, default: null },
    seoTitle: { type: String, trim: true, maxlength: 180, default: '' },
    seoDescription: { type: String, trim: true, maxlength: 320, default: '' },
    status: {
      type: String,
      enum: ARTICLE_STATUS_VALUES,
      default: ARTICLE_STATUSES.DRAFT,
      required: true,
      index: true,
    },
    assignedModerator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    declarationAccepted: { type: Boolean, default: false },
    wordCount: { type: Number, min: 0, default: 0 },
    readingMinutes: { type: Number, min: 0, default: 0 },
    submittedAt: { type: Date, default: null, index: true },
    reviewStartedAt: { type: Date, default: null },
    changesRequestedAt: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    publishedAt: { type: Date, default: null, index: true },
    publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    rejectedAt: { type: Date, default: null },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    archivedAt: { type: Date, default: null },
    archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    latestAuthorVisibleNote: { type: String, trim: true, maxlength: 3000, default: '' },
    revision: { type: Number, min: 1, default: 1 },
    deletedAt: { type: Date, default: null, select: false, index: true },
  },
  {
    timestamps: true,
    minimize: false,
    toJSON: {
      transform(_document, returned) {
        returned.id = returned._id?.toString();
        delete returned._id;
        delete returned.__v;
        delete returned.deletedAt;
        if (returned.featuredImage) {
          delete returned.featuredImage.storageKey;
          delete returned.featuredImage.providerAssetId;
          delete returned.featuredImage.providerSecureUrl;
          delete returned.featuredImage.checksumSha256;
        }
        return returned;
      },
    },
  },
);

articleSchema.index(
  { slug: 1 },
  {
    unique: true,
    partialFilterExpression: { slug: { $type: 'string' } },
  },
);
articleSchema.index({ status: 1, publishedAt: -1 });
articleSchema.index({ author: 1, status: 1, updatedAt: -1 });
articleSchema.index({ authorSlug: 1, status: 1, publishedAt: -1 });
articleSchema.index({ categorySlug: 1, status: 1, publishedAt: -1 });
articleSchema.index({ tagSlugs: 1, status: 1, publishedAt: -1 });
articleSchema.index(
  { title: 'text', summary: 'text', content: 'text', authorName: 'text', tagNames: 'text' },
  { weights: { title: 10, summary: 5, authorName: 4, tagNames: 3, content: 1 } },
);

const Article = mongoose.models.Article || mongoose.model('Article', articleSchema);

export default Article;
