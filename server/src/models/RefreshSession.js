import mongoose from 'mongoose';

const refreshSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    jti: { type: String, required: true, unique: true },
    familyId: { type: String, required: true, index: true },
    tokenHash: { type: String, required: true, select: false },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    rotatedAt: { type: Date, default: null },
    replacedByJti: { type: String, default: null },
    revokedAt: { type: Date, default: null },
    revocationReason: { type: String, default: null, maxlength: 120 },
    createdByIp: { type: String, default: null, maxlength: 128 },
    lastUsedIp: { type: String, default: null, maxlength: 128 },
    userAgent: { type: String, default: null, maxlength: 512 },
    lastUsedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

refreshSessionSchema.index({ user: 1, familyId: 1 });
refreshSessionSchema.index({ user: 1, revokedAt: 1, expiresAt: 1 });

const RefreshSession =
  mongoose.models.RefreshSession ||
  mongoose.model('RefreshSession', refreshSessionSchema);

export default RefreshSession;
