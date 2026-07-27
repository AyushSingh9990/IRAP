import mongoose from 'mongoose';

const receiptSchema = new mongoose.Schema(
  {
    receiptNumber: { type: String, required: true, unique: true, index: true, uppercase: true },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', required: true, unique: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true },
    issuedAt: { type: Date, required: true, default: Date.now },
    currency: { type: String, required: true, uppercase: true, minlength: 3, maxlength: 3 },
    subtotalMinor: { type: Number, required: true, min: 0 },
    discountMinor: { type: Number, required: true, min: 0 },
    taxMinor: { type: Number, required: true, min: 0 },
    totalMinor: { type: Number, required: true, min: 0 },
    recipient: {
      fullName: { type: String, required: true },
      email: { type: String, required: true },
      countryCode: { type: String, default: '' },
    },
    plan: {
      code: { type: String, required: true },
      name: { type: String, required: true },
    },
    paymentReference: { type: String, required: true },
    provider: { type: String, required: true },
    providerPaymentId: { type: String, default: '' },
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

const Receipt = mongoose.models.Receipt || mongoose.model('Receipt', receiptSchema);
export default Receipt;
