import mongoose from 'mongoose';

const couponRedemptionSchema = new mongoose.Schema(
  {
    coupon: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', required: true, unique: true },
    redeemedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

couponRedemptionSchema.index({ coupon: 1, user: 1, redeemedAt: -1 });

const CouponRedemption =
  mongoose.models.CouponRedemption ||
  mongoose.model('CouponRedemption', couponRedemptionSchema);

export default CouponRedemption;
