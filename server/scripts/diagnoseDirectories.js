import mongoose from 'mongoose';

const { connectDatabase } = await import('../src/config/database.js');
const { default: Membership } = await import('../src/models/Membership.js');
const { default: PublicProfile } = await import('../src/models/PublicProfile.js');

let connected = false;

try {
  await connectDatabase();
  connected = mongoose.connection.readyState === 1;

  if (!connected) throw new Error('MongoDB could not be reached.');

  const removed = await PublicProfile.syncIndexes();
  const [memberships, profiles, published, eligible] = await Promise.all([
    Membership.countDocuments(),
    PublicProfile.countDocuments(),
    PublicProfile.countDocuments({ published: true }),
    Membership.countDocuments({
      status: { $in: ['active', 'renewal_due'] },
      directoryVisible: true,
      validUntil: { $gte: new Date() },
    }),
  ]);

  console.log(`Database: ${mongoose.connection.name}`);
  console.log(`Membership records: ${memberships}`);
  console.log(`Public profiles: ${profiles}`);
  console.log(`Published profiles: ${published}`);
  console.log(`Active directory-visible memberships: ${eligible}`);
  console.log(`Removed obsolete indexes: ${removed.length ? removed.join(', ') : 'none'}`);

  const indexes = await PublicProfile.collection.indexes();
  console.log('Current PublicProfile indexes:');
  for (const index of indexes) {
    console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
  }

  console.log('Public-directory diagnostics completed successfully.');
} catch (error) {
  console.error(error?.message || error);
  process.exitCode = 1;
} finally {
  if (connected) {
    await mongoose.disconnect();
    console.log('MongoDB connection closed.');
  }
}
