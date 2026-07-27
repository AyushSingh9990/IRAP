import mongoose from 'mongoose';
import {
  ARTICLE_TAXONOMY_STATUSES,
  ARTICLE_TAXONOMY_STATUS_VALUES,
} from '../constants/articleConstants.js';

const articleTagSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    status: {
      type: String,
      enum: ARTICLE_TAXONOMY_STATUS_VALUES,
      default: ARTICLE_TAXONOMY_STATUSES.ACTIVE,
      index: true,
    },
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

articleTagSchema.index({ status: 1, name: 1 });

const ArticleTag =
  mongoose.models.ArticleTag || mongoose.model('ArticleTag', articleTagSchema);

export default ArticleTag;
