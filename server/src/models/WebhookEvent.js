import mongoose from 'mongoose';
import { PAYMENT_PROVIDER_VALUES } from '../constants/paymentConstants.js';

const webhookEventSchema = new mongoose.Schema(
  {
    provider: { type: String, enum: PAYMENT_PROVIDER_VALUES, required: true, index: true },
    eventId: { type: String, required: true, maxlength: 255 },
    eventType: { type: String, required: true, maxlength: 255, index: true },
    payloadHash: { type: String, required: true, minlength: 64, maxlength: 64 },
    processingStatus: {
      type: String,
      enum: ['received', 'processed', 'ignored', 'failed'],
      default: 'received',
      index: true,
    },
    errorMessage: { type: String, trim: true, maxlength: 1500, default: '' },
    processedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

webhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });
webhookEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 180 });

const WebhookEvent =
  mongoose.models.WebhookEvent || mongoose.model('WebhookEvent', webhookEventSchema);
export default WebhookEvent;
