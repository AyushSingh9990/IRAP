import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(currentDirectory, '../.env') });

const { environment } = await import('../src/config/environment.js');
const { default: User } = await import('../src/models/User.js');
const { default: VerificationToken } = await import('../src/models/VerificationToken.js');
const { ROLES } = await import('../src/constants/roles.js');

const testEmail = `irap-diagnostic-${Date.now()}@example.invalid`;
let testUserId;

function success(message) {
  console.log(`✓ ${message}`);
}

function fail(stage, error) {
  console.error(`\n✗ Registration diagnostic failed during: ${stage}`);
  console.error(`Name: ${error?.name ?? 'UnknownError'}`);
  console.error(`Message: ${error?.message ?? String(error)}`);
  if (error?.code !== undefined) console.error(`Code: ${error.code}`);
  if (error?.codeName) console.error(`Code name: ${error.codeName}`);
  if (error?.keyPattern) console.error(`Key pattern: ${JSON.stringify(error.keyPattern)}`);
}

try {
  if (!environment.mongodbUri) {
    throw new Error('MONGODB_URI is empty in server/.env.');
  }

  await mongoose.connect(environment.mongodbUri, {
    dbName: environment.databaseName,
    autoIndex: false,
    serverSelectionTimeoutMS: 10000,
  });
  success(`Connected to MongoDB database "${environment.databaseName}".`);

  await mongoose.connection.db.admin().command({ ping: 1 });
  success('MongoDB ping succeeded.');

  try {
    await User.createIndexes();
    await VerificationToken.createIndexes();
    success('Authentication indexes are valid.');
  } catch (error) {
    fail('authentication index creation', error);
    console.error(
      '\nOpen MongoDB Atlas → Browse Collections → irap → users/verificationtokens → Indexes and remove only the conflicting old index named in the error.',
    );
    process.exitCode = 1;
    throw error;
  }

  const user = await User.create({
    firstName: 'Diagnostic',
    lastName: 'Account',
    displayName: 'Diagnostic Account',
    email: testEmail,
    passwordHash: 'diagnostic-hash-not-for-login',
    requestedJourneys: ['member'],
    roles: [ROLES.APPLICANT],
  });
  testUserId = user._id;
  success('User write succeeded.');

  await VerificationToken.create({
    user: user._id,
    type: 'email_verification',
    tokenHash: `diagnostic-${Date.now()}-${Math.random()}`,
    expiresAt: new Date(Date.now() + 60_000),
    createdByIp: '127.0.0.1',
  });
  success('Verification-token write succeeded.');

  await VerificationToken.deleteMany({ user: user._id });
  await User.deleteOne({ _id: user._id });
  testUserId = undefined;
  success('Diagnostic records were removed.');

  console.log('\nRegistration database checks passed.');
} catch (error) {
  if (!process.exitCode) {
    fail('database connection or write', error);
    process.exitCode = 1;
  }
} finally {
  if (testUserId) {
    await VerificationToken.deleteMany({ user: testUserId }).catch(() => {});
    await User.deleteOne({ _id: testUserId }).catch(() => {});
  }
  await mongoose.disconnect().catch(() => {});
}
