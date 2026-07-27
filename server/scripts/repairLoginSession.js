import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { nanoid } from 'nanoid';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(currentDirectory, '../.env') });

const { environment } = await import('../src/config/environment.js');
const { default: RefreshSession } = await import('../src/models/RefreshSession.js');
const { default: User } = await import('../src/models/User.js');
const {
  createTokenId,
  getRefreshExpiryDate,
  hashToken,
  signRefreshToken,
} = await import('../src/services/token.service.js');

const email = process.argv[2]?.trim().toLowerCase();

if (!email) {
  console.error(
    'Usage: node server/scripts/repairLoginSession.js your-email@example.com',
  );
  process.exit(1);
}

async function dropRefreshSessionsCollection() {
  const collectionName = RefreshSession.collection.collectionName;

  try {
    await mongoose.connection.db.dropCollection(collectionName);
    console.log(`✓ Dropped old ${collectionName} collection.`);
  } catch (error) {
    if (error?.codeName === 'NamespaceNotFound' || error?.code === 26) {
      console.log(`• ${collectionName} did not exist; nothing needed dropping.`);
      return;
    }

    throw error;
  }
}

async function main() {
  try {
    await mongoose.connect(environment.mongodbUri, {
      dbName: environment.databaseName,
      serverSelectionTimeoutMS: 15000,
    });

    console.log(`✓ Connected to MongoDB database "${environment.databaseName}".`);

    const user = await User.findOne({ email });

    if (!user) {
      throw new Error(`No user was found for ${email}.`);
    }

    console.log(`✓ Found account: ${user.email}`);
    console.log(`  Status: ${user.accountStatus}`);
    console.log(`  Verified: ${Boolean(user.emailVerifiedAt)}`);

    if (!user.emailVerifiedAt) {
      throw new Error(
        'The account is not email verified. Verify the email before logging in.',
      );
    }

    if (user.accountStatus === 'locked') {
      user.accountStatus = 'active';
      user.failedLoginAttempts = 0;
      user.lockUntil = null;
      await user.save();
      console.log('✓ Cleared the account login lock.');
    }

    if (user.accountStatus !== 'active') {
      throw new Error(
        `The account status is "${user.accountStatus}", not "active".`,
      );
    }

    await dropRefreshSessionsCollection();

    await RefreshSession.createCollection();
    const removedIndexes = await RefreshSession.syncIndexes();

    if (removedIndexes.length > 0) {
      console.log(`✓ Removed outdated indexes: ${removedIndexes.join(', ')}`);
    } else {
      console.log('✓ Login-session indexes are already current.');
    }

    const sessionId = createTokenId();
    const familyId = nanoid(32);
    const refreshToken = signRefreshToken({
      userId: user.id,
      sessionId,
      familyId,
    });

    const probe = await RefreshSession.create({
      user: user._id,
      jti: sessionId,
      familyId,
      tokenHash: hashToken(refreshToken),
      expiresAt: getRefreshExpiryDate(),
      createdByIp: '127.0.0.1',
      lastUsedIp: '127.0.0.1',
      userAgent: 'iRAP login repair diagnostic',
    });

    console.log('✓ A new login session was created successfully.');

    await RefreshSession.deleteOne({ _id: probe._id });
    console.log('✓ Diagnostic login session was removed.');

    console.log('');
    console.log('Login-session repair completed successfully.');
    console.log('Restart the server and try logging in again.');
  } catch (error) {
    console.error('');
    console.error('Login-session repair failed.');
    console.error(error?.stack || error?.message || error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

void main();
