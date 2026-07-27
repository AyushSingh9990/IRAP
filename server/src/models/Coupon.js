import mongoose from 'mongoose';
import { APPLICATION_TYPE_VALUES } from '../constants/applicationTypes.js';
import { COUPON_TYPE_VALUES } from '../constants/paymentConstants.js';

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      index: true,
      uppercase: true,
      trim: true,
      minlength: 3,
      maxlength: 40,
      match: /^[A-Z0-9_-]+$/,
    },
    description: { type: String, trim: true, maxlength: 500, default: '' },
    type: { type: String, enum: COUPON_TYPE_VALUES, required: true },
    value: { type: Number, required: true, min: 1 },
    currency: {
      type: String,
      required() {
        return this.type === 'fixed';
      },
      uppercase: true,
      trim: true,
      maxlength: 3,
      match: [/^$|^[A-Z]{3}$/, 'Currency must be a three-letter code.'],
      default: '',
    },
    planIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Plan' }],
    applicationTypes: [{ type: String, enum: APPLICATION_TYPE_VALUES }],
    minimumSubtotalMinor: { type: Number, min: 0, default: 0 },
    maximumDiscountMinor: { type: Number, min: 0, default: 0 },
    validFrom: { type: Date, default: null },
    validUntil: { type: Date, default: null },
    usageLimit: { type: Number, min: 0, default: 0 },
    perUserLimit: { type: Number, min: 0, default: 1 },
    usedCount: { type: Number, min: 0, default: 0 },
    active: { type: Boolean, default: true, index: true },
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

couponSchema.pre('validate', function validateCouponConfiguration() {
  if (this.type === 'percentage' && this.value > 100) {
    this.invalidate('value', 'Percentage coupons cannot exceed 100%.');
  }
  if (this.validFrom && this.validUntil && this.validFrom >= this.validUntil) {
    this.invalidate('validUntil', 'Coupon valid-until must be after valid-from.');
  }
});

couponSchema.index({ active: 1, validFrom: 1, validUntil: 1 });

const Coupon = mongoose.models.Coupon || mongoose.model('Coupon', couponSchema);
export default Coupon;
