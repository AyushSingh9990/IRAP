import mongoose from 'mongoose';
import { APPLICATION_TYPE_VALUES } from '../constants/applicationTypes.js';

const taxRateSchema = new mongoose.Schema(
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
    countryCode: {
      type: String,
      uppercase: true,
      trim: true,
      maxlength: 2,
      match: [/^$|^[A-Z]{2}$/, 'Country code must contain two letters.'],
      default: '',
    },
    stateCode: { type: String, uppercase: true, trim: true, maxlength: 20, default: '' },
    applicationTypes: [{ type: String, enum: APPLICATION_TYPE_VALUES }],
    rateBasisPoints: { type: Number, required: true, min: 0, max: 10000 },
    inclusive: { type: Boolean, default: false },
    priority: { type: Number, min: 0, max: 10000, default: 100 },
    validFrom: { type: Date, default: null },
    validUntil: { type: Date, default: null },
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

taxRateSchema.pre('validate', function validateTaxConfiguration() {
  if (this.validFrom && this.validUntil && this.validFrom >= this.validUntil) {
    this.invalidate('validUntil', 'Tax valid-until must be after valid-from.');
  }
});

taxRateSchema.index({ active: 1, countryCode: 1, stateCode: 1, priority: 1 });

const TaxRate = mongoose.models.TaxRate || mongoose.model('TaxRate', taxRateSchema);
export default TaxRate;
