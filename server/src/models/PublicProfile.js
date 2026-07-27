import mongoose from 'mongoose';
import {
  DELIVERY_METHOD_VALUES,
  PROFILE_TYPE_VALUES,
} from '../constants/directoryConstants.js';

const socialLinksSchema = new mongoose.Schema(
  {
    linkedin: { type: String, trim: true, maxlength: 500, default: '' },
    facebook: { type: String, trim: true, maxlength: 500, default: '' },
    instagram: { type: String, trim: true, maxlength: 500, default: '' },
    youtube: { type: String, trim: true, maxlength: 500, default: '' },
    x: { type: String, trim: true, maxlength: 500, default: '' },
  },
  { _id: false },
);

const contactSchema = new mongoose.Schema(
  {
    email: { type: String, trim: true, lowercase: true, maxlength: 254, default: '' },
    telephone: { type: String, trim: true, maxlength: 40, default: '' },
    website: { type: String, trim: true, maxlength: 500, default: '' },
    showEmail: { type: Boolean, default: false },
    showTelephone: { type: Boolean, default: false },
    socialLinks: { type: socialLinksSchema, default: () => ({}) },
  },
  { _id: false },
);

const locationSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, maxlength: 160, default: '' },
    countryCode: { type: String, trim: true, uppercase: true, maxlength: 2, default: '' },
    state: { type: String, trim: true, maxlength: 120, default: '' },
    city: { type: String, trim: true, maxlength: 120, default: '' },
    address: { type: String, trim: true, maxlength: 500, default: '' },
    latitude: { type: Number, min: -90, max: 90, default: null },
    longitude: { type: Number, min: -180, max: 180, default: null },
  },
  { _id: true },
);

const pointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point', required: true },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator(value) {
          return (
            Array.isArray(value) &&
            value.length === 2 &&
            Number.isFinite(value[0]) &&
            Number.isFinite(value[1])
          );
        },
        message: 'A valid longitude and latitude pair is required.',
      },
    },
  },
  { _id: false },
);

const publicProfileSchema = new mongoose.Schema(
  {
    membership: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Membership',
      required: true,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    profileType: {
      type: String,
      enum: PROFILE_TYPE_VALUES,
      required: true,
      index: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 180,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    displayName: { type: String, required: true, trim: true, minlength: 2, maxlength: 240 },
    headline: { type: String, trim: true, maxlength: 240, default: '' },
    biography: { type: String, trim: true, maxlength: 5000, default: '' },
    modalities: [{ type: String, trim: true, maxlength: 120 }],
    qualifications: [{ type: String, trim: true, maxlength: 240 }],
    services: [{ type: String, trim: true, maxlength: 160 }],
    languages: [{ type: String, trim: true, maxlength: 80 }],
    deliveryMethods: [{ type: String, enum: DELIVERY_METHOD_VALUES }],
    onlineAvailable: { type: Boolean, default: false, index: true },
    locations: {
      type: [locationSchema],
      default: [],
      validate: {
        validator(value) {
          return value.length <= 25;
        },
        message: 'A public profile cannot contain more than 25 locations.',
      },
    },
    primaryLocation: { type: pointSchema, default: undefined },
    contact: { type: contactSchema, default: () => ({}) },
    businessHours: { type: String, trim: true, maxlength: 1500, default: '' },
    pricingText: { type: String, trim: true, maxlength: 1000, default: '' },
    photoUrl: { type: String, trim: true, maxlength: 1000, default: '' },
    logoUrl: { type: String, trim: true, maxlength: 1000, default: '' },
    galleryUrls: [{ type: String, trim: true, maxlength: 1000 }],
    videoUrls: [{ type: String, trim: true, maxlength: 1000 }],
    mission: { type: String, trim: true, maxlength: 3000, default: '' },
    trainerInformation: { type: String, trim: true, maxlength: 3000, default: '' },
    course: {
      category: { type: String, trim: true, maxlength: 160, default: '' },
      accreditationNumber: { type: String, trim: true, maxlength: 120, default: '' },
      providerName: { type: String, trim: true, maxlength: 240, default: '' },
      cpdHours: { type: Number, min: 0, max: 100000, default: null },
      priceMinor: { type: Number, min: 0, max: 1000000000, default: null },
      currency: { type: String, trim: true, uppercase: true, maxlength: 3, default: 'INR' },
      validFrom: { type: Date, default: null },
      validUntil: { type: Date, default: null },
      certificateNumber: { type: String, trim: true, maxlength: 120, default: '' },
      verificationCode: { type: String, trim: true, maxlength: 80, default: '' },
      creditUnit: { type: String, enum: ['CPD', 'CEU'], default: null },
      totalLearningHours: { type: Number, min: 0, max: 10000, default: null },
    },
    published: { type: Boolean, default: false, index: true },
    seoTitle: { type: String, trim: true, maxlength: 180, default: '' },
    seoDescription: { type: String, trim: true, maxlength: 320, default: '' },
    lastPublishedAt: { type: Date, default: null },
  },
  { timestamps: true, minimize: false },
);

publicProfileSchema.index({ membership: 1, profileType: 1 });
publicProfileSchema.index({ profileType: 1, published: 1, displayName: 1 });
publicProfileSchema.index({ profileType: 1, published: 1, 'locations.countryCode': 1 });
publicProfileSchema.index({ profileType: 1, published: 1, modalities: 1 });
publicProfileSchema.index({ profileType: 1, published: 1, 'course.accreditationNumber': 1 });
publicProfileSchema.index({ primaryLocation: '2dsphere' });

const PublicProfile =
  mongoose.models.PublicProfile ||
  mongoose.model('PublicProfile', publicProfileSchema);

export default PublicProfile;
