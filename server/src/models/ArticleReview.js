import mongoose from 'mongoose';
import { ARTICLE_STATUS_VALUES } from '../constants/articleConstants.js';

const articleReviewSchema = new mongoose.Schema(
  {
    article: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Article',
      required: true,
      index: true,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    previousStatus: {
      type: String,
      enum: ARTICLE_STATUS_VALUES,
      default: null,
    },
    newStatus: {
      type: String,
      enum: ARTICLE_STATUS_VALUES,
      required: true,
      index: true,
    },
    internalNote: { type: String, trim: true, maxlength: 3000, default: '' },
    authorVisibleNote: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: '',
    },
    ipAddress: { type: String, trim: true, maxlength: 128, default: '' },
    userAgent: { type: String, trim: true, maxlength: 500, default: '' },
    requestId: { type: String, trim: true, maxlength: 160, default: '' },
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

articleReviewSchema.index({ article: 1, createdAt: -1 });

const ArticleReview =
  mongoose.models.ArticleReview ||
  mongoose.model('ArticleReview', articleReviewSchema);

export default ArticleReview;
