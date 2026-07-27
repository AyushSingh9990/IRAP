import mongoose from 'mongoose';

const verificationTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'email_verification',
        'password_reset',
        'email_change',
        'login_2fa',
      ],
      required: true,
      index: true,
    },
    tokenHash: { type: String, required: true, unique: true, select: false },
    newEmail: { type: String, lowercase: true, trim: true, maxlength: 254, select: false },
    codeHash: { type: String, select: false },
    attempts: { type: Number, default: 0, min: 0, max: 10 },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    consumedAt: { type: Date, default: null },
    createdByIp: { type: String, default: null, maxlength: 128 },
  },
  { timestamps: true },
);

verificationTokenSchema.index({ user: 1, type: 1, consumedAt: 1 });

const VerificationToken =
  mongoose.models.VerificationToken ||
  mongoose.model('VerificationToken', verificationTokenSchema);

export default VerificationToken;
