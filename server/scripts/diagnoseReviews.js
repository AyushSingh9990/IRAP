import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import Application from '../src/models/Application.js';
import ApplicationReview from '../src/models/ApplicationReview.js';
import AuditLog from '../src/models/AuditLog.js';
import User from '../src/models/User.js';

async function run() {
  const connected = await connectDatabase();
  if (!connected || mongoose.connection.readyState !== 1) {
    throw new Error('MongoDB could not be reached.');
  }

  await Promise.all([
    User.createIndexes(),
    Application.createIndexes(),
    ApplicationReview.createIndexes(),
    AuditLog.createIndexes(),
  ]);
  console.log('Administrative review collection indexes are present.');

  const [reviewers, reviewCases, assignedCases, auditEntries] = await Promise.all([
    User.countDocuments({ roles: { $in: ['reviewer', 'super_admin'] }, accountStatus: 'active' }),
    ApplicationReview.countDocuments(),
    ApplicationReview.countDocuments({ assignedReviewer: { $ne: null } }),
    AuditLog.countDocuments(),
  ]);

  console.log(`Active reviewer-capable accounts: ${reviewers}`);
  console.log(`Application review cases: ${reviewCases}`);
  console.log(`Assigned review cases: ${assignedCases}`);
  console.log(`Administrative audit entries: ${auditEntries}`);
  console.log('Admin-review diagnostics completed successfully.');
}

run()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
