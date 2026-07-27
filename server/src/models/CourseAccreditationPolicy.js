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

const courseAccreditationPolicySchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      default: 'default',
    },
    validityMonths: {
      type: Number,
      required: true,
      min: 1,
      max: 120,
    },
    accreditationPrefix: prefixField,
    certificatePrefix: prefixField,
    authorizedSignatory: {
      name: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 160,
      },
      title: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 160,
      },
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

const CourseAccreditationPolicy =
  mongoose.models.CourseAccreditationPolicy ||
  mongoose.model(
    'CourseAccreditationPolicy',
    courseAccreditationPolicySchema,
  );

export default CourseAccreditationPolicy;
