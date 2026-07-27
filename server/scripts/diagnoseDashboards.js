import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import Application from '../src/models/Application.js';
import Document from '../src/models/Document.js';
import Notification from '../src/models/Notification.js';
import NotificationPreference from '../src/models/NotificationPreference.js';
import Payment from '../src/models/Payment.js';
import User from '../src/models/User.js';

async function run() {
  const connected = await connectDatabase();
  if (!connected || mongoose.connection.readyState !== 1) {
    throw new Error('MongoDB could not be reached.');
  }

  await Promise.all([
    User.createIndexes(),
    Application.createIndexes(),
    Document.createIndexes(),
    Payment.createIndexes(),
    Notification.createIndexes(),
    NotificationPreference.createIndexes(),
  ]);
  console.log('Dashboard and notification collection indexes are present.');

  const [
    users,
    applications,
    documents,
    payments,
    notifications,
    unreadNotifications,
    notificationPreferences,
  ] = await Promise.all([
    User.countDocuments(),
    Application.countDocuments({ deletedAt: null }),
    Document.countDocuments({ deletedAt: null, isCurrent: true }),
    Payment.countDocuments(),
    Notification.countDocuments({ archivedAt: null }),
    Notification.countDocuments({ archivedAt: null, readAt: null }),
    NotificationPreference.countDocuments(),
  ]);

  console.log(`Users: ${users}`);
  console.log(`Current applications: ${applications}`);
  console.log(`Current private documents: ${documents}`);
  console.log(`Payments: ${payments}`);
  console.log(`Notifications: ${notifications} (${unreadNotifications} unread)`);
  console.log(`Notification preference records: ${notificationPreferences}`);
  console.log('Role-dashboard diagnostics completed successfully.');
}

run()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
