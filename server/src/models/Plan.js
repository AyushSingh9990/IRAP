import mongoose from 'mongoose';
import { APPLICATION_TYPE_VALUES } from '../constants/applicationTypes.js';
import { APPLICATION_PURPOSES, APPLICATION_PURPOSE_VALUES } from '../constants/applicationPurposes.js';

const planSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      index: true,
      uppercase: true,
      trim: true,
      minlength: 2,
      maxlength: 40,
      match: /^[A-Z0-9_-]+$/,
    },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    applicationTypes: {
      type: [{ type: String, enum: APPLICATION_TYPE_VALUES }],
      required: true,
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length > 0;
        },
        message: 'At least one application type is required.',
      },
    },
    purposes: {
      type: [{ type: String, enum: APPLICATION_PURPOSE_VALUES }],
      required: true,
      default: [APPLICATION_PURPOSES.INITIAL],
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length > 0;
        },
        message: 'At least one billing purpose is required.',
      },
    },
    amountMinor: { type: Number, required: true, min: 1, max: 100_000_000 },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      minlength: 3,
      maxlength: 3,
    },
    features: {
      type: [{ type: String, trim: true, maxlength: 200 }],
      default: [],
      validate: {
        validator(value) {
          return value.length <= 20;
        },
        message: 'A plan cannot contain more than 20 features.',
      },
    },
    active: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, min: 0, max: 10000, default: 100 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
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

planSchema.index({ active: 1, sortOrder: 1, amountMinor: 1 });
planSchema.index({ active: 1, purposes: 1 });
planSchema.index({ active: 1, applicationTypes: 1 });

const Plan = mongoose.models.Plan || mongoose.model('Plan', planSchema);
export default Plan;
