import mongoose from 'mongoose';

const notificationPreferenceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    inAppEnabled: { type: Boolean, default: true },
    emailEnabled: { type: Boolean, default: true },
    applicationUpdates: { type: Boolean, default: true },
    paymentUpdates: { type: Boolean, default: true },
    documentUpdates: { type: Boolean, default: true },
    securityAlerts: { type: Boolean, default: true },
    announcements: { type: Boolean, default: true },
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

const NotificationPreference =
  mongoose.models.NotificationPreference ||
  mongoose.model('NotificationPreference', notificationPreferenceSchema);

export default NotificationPreference;
