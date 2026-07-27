import Coupon from '../models/Coupon.js';
import Plan from '../models/Plan.js';
import TaxRate from '../models/TaxRate.js';
import { ApiError } from '../utils/ApiError.js';

const models = Object.freeze({ plans: Plan, coupons: Coupon, taxes: TaxRate });

function getModel(resource) {
  const model = models[resource];
  if (!model) throw new ApiError(404, 'Billing resource not found.');
  return model;
}

function normalizePayload(resource, input, actorId, creating) {
  const payload = { ...input, updatedBy: actorId };
  if (creating) payload.createdBy = actorId;
  if ('code' in payload) payload.code = payload.code.trim().toUpperCase();
  if ('currency' in payload && payload.currency) {
    payload.currency = payload.currency.trim().toUpperCase();
  }
  if ('countryCode' in payload && payload.countryCode) {
    payload.countryCode = payload.countryCode.trim().toUpperCase();
  }
  if ('stateCode' in payload && payload.stateCode) {
    payload.stateCode = payload.stateCode.trim().toUpperCase();
  }
  if (resource === 'coupons') {
    if (payload.type === 'percentage' && payload.value > 100) {
      throw new ApiError(422, 'Percentage coupons cannot exceed 100%.');
    }
    if (payload.type === 'fixed' && !payload.currency) {
      throw new ApiError(422, 'A currency is required for fixed coupons.');
    }
  }

  if (
    ['coupons', 'taxes'].includes(resource) &&
    payload.validFrom &&
    payload.validUntil &&
    new Date(payload.validFrom) >= new Date(payload.validUntil)
  ) {
    throw new ApiError(422, 'Valid-until must be after valid-from.');
  }

  return payload;
}

export async function listBillingResources(resource) {
  const Model = getModel(resource);
  return Model.find().sort({ active: -1, sortOrder: 1, createdAt: -1 });
}

export async function createBillingResource({ resource, input, actorId }) {
  const Model = getModel(resource);
  const item = new Model(normalizePayload(resource, input, actorId, true));
  await item.save();
  return item;
}

export async function updateBillingResource({ resource, itemId, input, actorId }) {
  const Model = getModel(resource);
  const item = await Model.findById(itemId);
  if (!item) throw new ApiError(404, 'Billing resource not found.');

  Object.assign(item, normalizePayload(resource, input, actorId, false));
  await item.save();
  return item;
}
