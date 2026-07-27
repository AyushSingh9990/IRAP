import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { processMembershipRenewals } from '../src/services/membership.service.js';

async function run() {
  const connected = await connectDatabase();
  if (!connected || mongoose.connection.readyState !== 1) {
    throw new Error('MongoDB could not be reached.');
  }

  const result = await processMembershipRenewals();
  console.log(`Memberships checked: ${result.membershipsChecked}`);
  console.log(`Statuses updated: ${result.statusesUpdated}`);
  console.log(`Renewal reminders created: ${result.remindersSent}`);
  console.log('Membership renewal processing completed successfully.');
}

run()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
