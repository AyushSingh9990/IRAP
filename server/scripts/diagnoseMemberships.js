import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import Application from '../src/models/Application.js';
import Certificate from '../src/models/Certificate.js';
import Membership from '../src/models/Membership.js';
import MembershipPolicy from '../src/models/MembershipPolicy.js';
import Notification from '../src/models/Notification.js';
import Plan from '../src/models/Plan.js';
import SequenceCounter from '../src/models/SequenceCounter.js';

async function run() {
  const connected = await connectDatabase();
  if (!connected || mongoose.connection.readyState !== 1) {
    throw new Error('MongoDB could not be reached.');
  }

  await Promise.all([
    Application.createIndexes(),
    Membership.createIndexes(),
    MembershipPolicy.createIndexes(),
    Certificate.createIndexes(),
    SequenceCounter.createIndexes(),
    Notification.createIndexes(),
    Plan.createIndexes(),
  ]);
  console.log('Membership and certificate collection indexes are present.');

  const migratedPlans = await Plan.updateMany(
    {
      $or: [
        { purposes: { $exists: false } },
        { purposes: { $size: 0 } },
      ],
    },
    { $set: { purposes: ['initial'] } },
  );
  if (migratedPlans.modifiedCount > 0) {
    console.log(`Migrated ${migratedPlans.modifiedCount} existing plan(s) to the initial application purpose.`);
  }

  const [
    policies,
    memberships,
    certificates,
    renewalApplications,
    approvedApplications,
  ] = await Promise.all([
    MembershipPolicy.countDocuments(),
    Membership.countDocuments(),
    Certificate.countDocuments(),
    Application.countDocuments({ purpose: 'renewal' }),
    Application.countDocuments({ status: 'approved' }),
  ]);

  const issuedApplications = await Membership.distinct('currentApplication');
  const approvedWithoutCurrentRecord = await Application.countDocuments({
    status: 'approved',
    _id: { $nin: issuedApplications },
  });
  const membershipsWithoutCertificate = await Membership.countDocuments({
    currentCertificate: null,
  });

  console.log(`Membership policies: ${policies}`);
  console.log(`Membership and accreditation records: ${memberships}`);
  console.log(`Certificate records: ${certificates}`);
  console.log(`Renewal applications: ${renewalApplications}`);
  console.log(`Approved applications: ${approvedApplications}`);
  console.log(`Approved applications awaiting issuance: ${approvedWithoutCurrentRecord}`);
  console.log(`Registry records without a current certificate: ${membershipsWithoutCertificate}`);

  if (policies === 0) {
    console.log('Membership policy is not configured. Configure it at /admin/memberships before issuance.');
  }

  console.log('Membership and certificate diagnostics completed successfully.');
}

run()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
