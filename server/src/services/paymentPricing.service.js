import mongoose from 'mongoose';
import { COUPON_TYPES } from '../constants/paymentConstants.js';
import Coupon from '../models/Coupon.js';
import CouponRedemption from '../models/CouponRedemption.js';
import Plan from '../models/Plan.js';
import TaxRate from '../models/TaxRate.js';
import { ApiError } from '../utils/ApiError.js';

function isWithinDates(item, now) {
  return (!item.validFrom || item.validFrom <= now) &&
    (!item.validUntil || item.validUntil >= now);
}

async function validateCoupon({ couponCode, plan, applicationType, userId, now }) {
  if (!couponCode) return null;

  const coupon = await Coupon.findOne({
    code: couponCode.trim().toUpperCase(),
    active: true,
  });

  if (!coupon || !isWithinDates(coupon, now)) {
    throw new ApiError(422, 'The coupon is invalid or has expired.');
  }

  if (coupon.planIds.length > 0 && !coupon.planIds.some((id) => id.equals(plan._id))) {
    throw new ApiError(422, 'The coupon does not apply to the selected plan.');
  }

  if (
    coupon.applicationTypes.length > 0 &&
    !coupon.applicationTypes.includes(applicationType)
  ) {
    throw new ApiError(422, 'The coupon does not apply to this application type.');
  }

  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
    throw new ApiError(422, 'The coupon usage limit has been reached.');
  }

  if (coupon.perUserLimit > 0) {
    const userUsageCount = await CouponRedemption.countDocuments({
      coupon: coupon._id,
      user: userId,
    });
    if (userUsageCount >= coupon.perUserLimit) {
      throw new ApiError(422, 'You have already used this coupon.');
    }
  }

  if (plan.amountMinor < coupon.minimumSubtotalMinor) {
    throw new ApiError(422, 'The selected plan does not meet the coupon minimum amount.');
  }

  if (
    coupon.type === COUPON_TYPES.FIXED &&
    coupon.currency &&
    coupon.currency !== plan.currency
  ) {
    throw new ApiError(422, 'The coupon currency does not match the selected plan.');
  }

  return coupon;
}

function calculateDiscount(plan, coupon) {
  if (!coupon) return 0;

  let discount;
  if (coupon.type === COUPON_TYPES.PERCENTAGE) {
    discount = Math.round((plan.amountMinor * coupon.value) / 100);
  } else {
    discount = coupon.value;
  }

  if (coupon.maximumDiscountMinor > 0) {
    discount = Math.min(discount, coupon.maximumDiscountMinor);
  }

  return Math.min(discount, plan.amountMinor);
}

async function resolveTax({ applicationType, billingCountry, billingState, now }) {
  const candidates = await TaxRate.find({
    active: true,
    $and: [
      { $or: [{ validFrom: null }, { validFrom: { $lte: now } }] },
      { $or: [{ validUntil: null }, { validUntil: { $gte: now } }] },
      {
        $or: [
          { applicationTypes: { $size: 0 } },
          { applicationTypes: applicationType },
        ],
      },
      {
        $or: [
          { countryCode: '' },
          { countryCode: billingCountry.toUpperCase() },
        ],
      },
      {
        $or: [
          { stateCode: '' },
          { stateCode: billingState.toUpperCase() },
        ],
      },
    ],
  }).sort({ priority: 1, stateCode: -1, countryCode: -1, rateBasisPoints: -1 });

  return candidates[0] || null;
}

export async function calculatePaymentQuote({
  planId,
  couponCode = '',
  applicationType,
  purpose = 'initial',
  userId,
  billingCountry,
  billingState = '',
}) {
  if (!mongoose.isValidObjectId(planId)) {
    throw new ApiError(422, 'The selected plan is invalid.');
  }

  const purposeFilter = purpose === 'initial'
    ? { $or: [{ purposes: purpose }, { purposes: { $exists: false } }] }
    : { purposes: purpose };
  const plan = await Plan.findOne({
    _id: planId,
    active: true,
    applicationTypes: applicationType,
    ...purposeFilter,
  });

  if (!plan) {
    throw new ApiError(404, 'No active plan was found for this application.');
  }

  const now = new Date();
  const coupon = await validateCoupon({
    couponCode,
    plan,
    applicationType,
    userId,
    now,
  });
  const taxRate = await resolveTax({
    applicationType,
    billingCountry,
    billingState,
    now,
  });

  const subtotalMinor = plan.amountMinor;
  const discountMinor = calculateDiscount(plan, coupon);
  const discountedMinor = Math.max(0, subtotalMinor - discountMinor);

  let taxableMinor = discountedMinor;
  let taxMinor = 0;
  let totalMinor = discountedMinor;

  if (taxRate?.rateBasisPoints > 0) {
    if (taxRate.inclusive) {
      taxMinor = Math.round(
        (discountedMinor * taxRate.rateBasisPoints) /
          (10000 + taxRate.rateBasisPoints),
      );
      taxableMinor = discountedMinor - taxMinor;
    } else {
      taxMinor = Math.round((discountedMinor * taxRate.rateBasisPoints) / 10000);
      totalMinor = discountedMinor + taxMinor;
    }
  }

  return {
    plan,
    coupon,
    taxRate,
    subtotalMinor,
    discountMinor,
    taxableMinor,
    taxMinor,
    totalMinor,
    currency: plan.currency,
    summary: {
      plan: plan.toJSON(),
      coupon: coupon ? coupon.toJSON() : null,
      taxRate: taxRate ? taxRate.toJSON() : null,
      subtotalMinor,
      discountMinor,
      taxableMinor,
      taxMinor,
      totalMinor,
      currency: plan.currency,
    },
  };
}
