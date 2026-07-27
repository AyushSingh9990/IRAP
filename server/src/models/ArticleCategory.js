import mongoose from 'mongoose';
import {
  ARTICLE_TAXONOMY_STATUSES,
  ARTICLE_TAXONOMY_STATUS_VALUES,
} from '../constants/articleConstants.js';

const articleCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 2,
      maxlength: 140,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    status: {
      type: String,
      enum: ARTICLE_TAXONOMY_STATUS_VALUES,
      default: ARTICLE_TAXONOMY_STATUSES.ACTIVE,
      index: true,
    },
    seoTitle: { type: String, trim: true, maxlength: 180, default: '' },
    seoDescription: { type: String, trim: true, maxlength: 320, default: '' },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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

articleCategorySchema.index({ status: 1, name: 1 });

const ArticleCategory =
  mongoose.models.ArticleCategory ||
  mongoose.model('ArticleCategory', articleCategorySchema);

export default ArticleCategory;
