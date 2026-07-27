import mongoose from 'mongoose';

const prefixField = {
  type: String,
  required: true,
  trim: true,
  uppercase: true,
  minlength: 2,
  maxlength: 12,
  match: /^[A-Z0-9]+$/,
};

const membershipPolicySchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      default: 'default',
    },
    validityMonths: {
      member: { type: Number, required: true, min: 1, max: 120 },
      trainingProvider: { type: Number, required: true, min: 1, max: 120 },
      organization: { type: Number, required: true, min: 1, max: 120 },
    },
    renewalWindowDays: { type: Number, required: true, min: 1, max: 365 },
    gracePeriodDays: { type: Number, required: true, min: 0, max: 365 },
    reminderDays: {
      type: [{ type: Number, min: 0, max: 365 }],
      required: true,
      validate: [
        {
          validator(value) {
            return Array.isArray(value) && value.length > 0 && value.length <= 12;
          },
          message: 'Configure between one and twelve renewal reminder offsets.',
        },
        {
          validator(value) {
            return new Set(value).size === value.length;
          },
          message: 'Renewal reminder offsets must be unique.',
        },
      ],
    },
    registrationPrefixes: {
      member: prefixField,
      trainingProvider: prefixField,
      organization: prefixField,
    },
    certificatePrefix: prefixField,
    authorizedSignatory: {
      name: { type: String, required: true, trim: true, minlength: 2, maxlength: 160 },
      title: { type: String, required: true, trim: true, minlength: 2, maxlength: 160 },
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
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

const MembershipPolicy =
  mongoose.models.MembershipPolicy ||
  mongoose.model('MembershipPolicy', membershipPolicySchema);

export default MembershipPolicy;
