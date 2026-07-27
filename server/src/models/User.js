import mongoose from 'mongoose';
import { ROLE_VALUES, ROLES, REGISTRATION_JOURNEY_VALUES } from '../constants/roles.js';

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 80 },
    lastName: { type: String, required: true, trim: true, maxlength: 80 },
    displayName: { type: String, trim: true, maxlength: 160 },
    telephone: { type: String, trim: true, maxlength: 30, default: '' },
    preferredLanguage: {
      type: String,
      trim: true,
      maxlength: 12,
      default: '',
      validate: {
        validator(value) {
          return !value || /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(value);
        },
        message: 'A valid language tag is required.',
      },
    },
    timeZone: {
      type: String,
      trim: true,
      maxlength: 100,
      default: '',
      validate: {
        validator(value) {
          if (!value) return true;
          try {
            new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
            return true;
          } catch {
            return false;
          }
        },
        message: 'A valid IANA time zone is required.',
      },
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    passwordHash: { type: String, required: true, select: false },
    requestedJourneys: {
      type: [{ type: String, enum: REGISTRATION_JOURNEY_VALUES }],
      default: [],
    },
    roles: {
      type: [{ type: String, enum: ROLE_VALUES }],
      default: [ROLES.APPLICANT],
    },
    additionalPermissions: { type: [String], default: [] },
    accountStatus: {
      type: String,
      enum: ['pending_verification', 'active', 'locked', 'suspended', 'disabled'],
      default: 'pending_verification',
      index: true,
    },
    emailVerifiedAt: { type: Date, default: null },
    passwordChangedAt: { type: Date, default: null },
    failedLoginAttempts: { type: Number, default: 0, min: 0 },
    lockUntil: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    lastLoginIp: { type: String, default: null, maxlength: 128 },
    twoFactor: {
      enabled: { type: Boolean, default: false },
      enforcedByAdmin: { type: Boolean, default: false },
      method: { type: String, enum: ['email'], default: 'email' },
      updatedAt: { type: Date, default: null },
    },
    deletedAt: { type: Date, default: null, select: false },
  },
  {
    timestamps: true,
    minimize: true,
    toJSON: {
      transform(_document, returned) {
        delete returned.passwordHash;
        delete returned.failedLoginAttempts;
        delete returned.lockUntil;
        delete returned.deletedAt;
        return returned;
      },
    },
  },
);

userSchema.index({ roles: 1, accountStatus: 1 });

userSchema.virtual('fullName').get(function fullName() {
  return `${this.firstName} ${this.lastName}`.trim();
});

userSchema.methods.isTemporarilyLocked = function isTemporarilyLocked() {
  return Boolean(this.lockUntil && this.lockUntil.getTime() > Date.now());
};

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;
