import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { z } from 'zod';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(currentDirectory, '../.env') });

const inputSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(12).max(128),
});

const parsed = inputSchema.safeParse({
  email: process.env.ADMIN_EMAIL,
  password: process.env.ADMIN_PASSWORD,
});

if (!parsed.success) {
  console.error('ADMIN_EMAIL must be valid and ADMIN_PASSWORD must contain 12–128 characters.');
  process.exit(1);
}

const { environment } = await import('../src/config/environment.js');
const { ROLES } = await import('../src/constants/roles.js');
const { default: RefreshSession } = await import('../src/models/RefreshSession.js');
const { default: User } = await import('../src/models/User.js');

async function main() {
  await mongoose.connect(environment.mongodbUri, {
    dbName: environment.databaseName,
    serverSelectionTimeoutMS: 15000,
  });

  const email = parsed.data.email.toLowerCase();
  const passwordHash = await bcrypt.hash(
    parsed.data.password,
    environment.auth.bcryptRounds,
  );
  let user = await User.findOne({ email }).select('+passwordHash');

  if (user) {
    user.roles = [...new Set([...user.roles, ROLES.SUPER_ADMIN])];
    user.passwordHash = passwordHash;
    user.passwordChangedAt = new Date();
    user.emailVerifiedAt ||= new Date();
    user.accountStatus = 'active';
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();
    await RefreshSession.deleteMany({ user: user._id });
    console.log(`✓ Updated existing account ${email} as super administrator.`);
  } else {
    user = await User.create({
      firstName: 'iRAP',
      lastName: 'Administrator',
      displayName: 'iRAP Administrator',
      email,
      passwordHash,
      requestedJourneys: [],
      roles: [ROLES.SUPER_ADMIN],
      accountStatus: 'active',
      emailVerifiedAt: new Date(),
    });
    console.log(`✓ Created super administrator ${email}.`);
  }

  console.log('The administrator can now open document, payment, and billing administration routes after login.');
}

main()
  .catch((error) => {
    console.error('Administrator setup failed.');
    console.error(error?.stack || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
