import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import { environment } from '../config/environment.js';
import { ROLES } from '../constants/roles.js';
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_TYPES,
} from '../constants/notificationConstants.js';
import RefreshSession from '../models/RefreshSession.js';
import User from '../models/User.js';
import VerificationToken from '../models/VerificationToken.js';
import { ApiError } from '../utils/ApiError.js';
import {
  sendEmailChangedNotice,
  sendEmailChangeVerification,
  sendPasswordResetEmail,
  sendTwoFactorCode,
  sendVerificationEmail,
} from './email.service.js';
import { createNotificationSafely } from './notification.service.js';
import { resolveUserPermissions } from './rolePermission.service.js';
import {
  createOpaqueToken,
  createTokenId,
  getRefreshExpiryDate,
  hashToken,
  signAccessToken,
  signRefreshToken,
  tokenHashesMatch,
  verifyRefreshToken,
} from './token.service.js';

const GENERIC_AUTH_ERROR = 'The email address or password is incorrect.';

async function serializeUser(user) {
  const permissions = await resolveUserPermissions(user);

  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    displayName: user.displayName || user.fullName,
    telephone: user.telephone || '',
    preferredLanguage: user.preferredLanguage || 'en',
    timeZone: user.timeZone || 'UTC',
    email: user.email,
    emailVerified: Boolean(user.emailVerifiedAt),
    accountStatus: user.accountStatus,
    roles: user.roles,
    permissions,
    requestedJourneys: user.requestedJourneys,
    twoFactor: {
      enabled: Boolean(user.twoFactor?.enabled),
      enforcedByAdmin: Boolean(user.twoFactor?.enforcedByAdmin),
      method: user.twoFactor?.method || 'email',
    },
    createdAt: user.createdAt,
  };
}

async function createVerificationToken({ user, type, ip, ttlMs, additionalData = {} }) {
  await VerificationToken.deleteMany({
    user: user._id,
    type,
    consumedAt: null,
  });

  const token = createOpaqueToken();
  await VerificationToken.create({
    user: user._id,
    type,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + ttlMs),
    createdByIp: ip,
    ...additionalData,
  });

  return token;
}

export async function registerUser({ input, ip }) {
  const existingUser = await User.findOne({ email: input.email });

  if (existingUser) {
    if (!existingUser.emailVerifiedAt) {
      if (!existingUser.requestedJourneys.includes(input.journey)) {
        existingUser.requestedJourneys.push(input.journey);
        await existingUser.save();
      }

      const token = await createVerificationToken({
        user: existingUser,
        type: 'email_verification',
        ip,
        ttlMs: environment.auth.emailVerificationTtlMs,
      });
      const delivery = await sendVerificationEmail({ user: existingUser, token });
      return { developmentUrl: delivery.developmentUrl };
    }

    return {};
  }

  const passwordHash = await bcrypt.hash(input.password, environment.auth.bcryptRounds);
  let user;

  try {
    user = await User.create({
      firstName: input.firstName,
      lastName: input.lastName,
      displayName: `${input.firstName} ${input.lastName}`.trim(),
      email: input.email,
      passwordHash,
      requestedJourneys: [input.journey],
      roles: [ROLES.APPLICANT],
    });

    const token = await createVerificationToken({
      user,
      type: 'email_verification',
      ip,
      ttlMs: environment.auth.emailVerificationTtlMs,
    });
    const delivery = await sendVerificationEmail({ user, token });

    return { developmentUrl: delivery.developmentUrl };
  } catch (error) {
    if (user?._id && !user.emailVerifiedAt) {
      await VerificationToken.deleteMany({ user: user._id }).catch(() => {});
      await User.deleteOne({ _id: user._id, emailVerifiedAt: null }).catch(() => {});
    }

    throw error;
  }
}

export async function verifyEmailToken(token) {
  const tokenRecord = await VerificationToken.findOne({
    tokenHash: hashToken(token),
    type: 'email_verification',
    consumedAt: null,
    expiresAt: { $gt: new Date() },
  });

  if (!tokenRecord) {
    throw new ApiError(400, 'The email-verification link is invalid or expired.');
  }

  const user = await User.findById(tokenRecord.user);
  if (!user) throw new ApiError(400, 'The email-verification link is invalid or expired.');

  tokenRecord.consumedAt = new Date();
  user.emailVerifiedAt = user.emailVerifiedAt || new Date();
  if (user.accountStatus === 'pending_verification') user.accountStatus = 'active';

  await user.save();
  await tokenRecord.save();
  return serializeUser(user);
}

export async function resendVerification({ email, ip }) {
  const user = await User.findOne({ email });
  if (!user || user.emailVerifiedAt) return {};

  const token = await createVerificationToken({
    user,
    type: 'email_verification',
    ip,
    ttlMs: environment.auth.emailVerificationTtlMs,
  });
  const delivery = await sendVerificationEmail({ user, token });
  return { developmentUrl: delivery.developmentUrl };
}

async function recordFailedLogin(user) {
  user.failedLoginAttempts += 1;
  if (user.failedLoginAttempts >= environment.auth.maxLoginAttempts) {
    user.lockUntil = new Date(Date.now() + environment.auth.lockDurationMs);
    user.accountStatus = 'locked';
  }
  await user.save();
}

async function clearExpiredLock(user) {
  if (user.accountStatus === 'locked' && !user.isTemporarilyLocked()) {
    user.accountStatus = user.emailVerifiedAt ? 'active' : 'pending_verification';
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();
  }
}

async function createSession({
  user,
  ip,
  userAgent,
  familyId = nanoid(32),
  sessionId = createTokenId(),
}) {
  const jti = sessionId;
  const permissions = await resolveUserPermissions(user);
  const refreshToken = signRefreshToken({
    userId: user.id,
    sessionId: jti,
    familyId,
  });

  await RefreshSession.create({
    user: user._id,
    jti,
    familyId,
    tokenHash: hashToken(refreshToken),
    expiresAt: getRefreshExpiryDate(),
    createdByIp: ip,
    lastUsedIp: ip,
    userAgent,
  });

  const accessToken = signAccessToken({
    userId: user.id,
    roles: user.roles,
    permissions,
    sessionId: jti,
  });

  return { accessToken, refreshToken, sessionId: jti, familyId };
}


async function createTwoFactorChallenge({ user, ip }) {
  await VerificationToken.deleteMany({
    user: user._id,
    type: 'login_2fa',
    consumedAt: null,
  });

  const challenge = createOpaqueToken();
  const code = crypto.randomInt(100000, 1000000).toString();
  await VerificationToken.create({
    user: user._id,
    type: 'login_2fa',
    tokenHash: hashToken(challenge),
    codeHash: await bcrypt.hash(code, environment.auth.bcryptRounds),
    expiresAt: new Date(Date.now() + environment.auth.twoFactorTtlMs),
    createdByIp: ip,
  });
  const delivery = await sendTwoFactorCode({ user, code });
  if (environment.isProduction && !delivery.delivered) {
    await VerificationToken.deleteOne({ tokenHash: hashToken(challenge) });
    throw new ApiError(503, 'The verification code could not be delivered. Please try again.');
  }

  return { challenge, developmentCode: environment.isProduction ? undefined : code };
}

export async function loginUser({ email, password, ip, userAgent }) {
  const user = await User.findOne({ email }).select('+passwordHash');

  if (!user) {
    await bcrypt.compare(password, '$2b$12$C6UzMDM.H6dfI/f/IKcEe.ouZ5xZ/8IplcS3t2eQ1gY8L5fP4tY9K');
    throw new ApiError(401, GENERIC_AUTH_ERROR);
  }

  await clearExpiredLock(user);

  if (user.isTemporarilyLocked()) throw new ApiError(401, GENERIC_AUTH_ERROR);

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    await recordFailedLogin(user);
    throw new ApiError(401, GENERIC_AUTH_ERROR);
  }

  if (!user.emailVerifiedAt) {
    throw new ApiError(403, 'Verify your email address before logging in.');
  }

  if (!['active'].includes(user.accountStatus)) {
    throw new ApiError(403, 'This account is not currently available.');
  }

  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  await user.save();

  if (user.twoFactor?.enabled || user.twoFactor?.enforcedByAdmin) {
    const challenge = await createTwoFactorChallenge({ user, ip });
    return { requiresTwoFactor: true, ...challenge };
  }

  user.lastLoginAt = new Date();
  user.lastLoginIp = ip;
  await user.save();

  const tokens = await createSession({ user, ip, userAgent });
  return { user: await serializeUser(user), ...tokens };
}


export async function completeTwoFactorLogin({ challenge, code, ip, userAgent }) {
  const tokenRecord = await VerificationToken.findOne({
    tokenHash: hashToken(challenge),
    type: 'login_2fa',
    consumedAt: null,
    expiresAt: { $gt: new Date() },
  }).select('+codeHash');

  if (!tokenRecord?.codeHash) {
    throw new ApiError(401, 'The verification challenge is invalid or expired.');
  }

  if (!(await bcrypt.compare(code, tokenRecord.codeHash))) {
    tokenRecord.attempts += 1;
    if (tokenRecord.attempts >= 5) tokenRecord.consumedAt = new Date();
    await tokenRecord.save();
    throw new ApiError(401, 'The verification code is incorrect or expired.');
  }

  const user = await User.findById(tokenRecord.user);
  if (!user || user.accountStatus !== 'active') {
    throw new ApiError(401, 'The verification challenge is invalid or expired.');
  }

  tokenRecord.consumedAt = new Date();
  user.lastLoginAt = new Date();
  user.lastLoginIp = ip;
  await user.save();
  await tokenRecord.save();

  const tokens = await createSession({ user, ip, userAgent });
  return { user: await serializeUser(user), ...tokens };
}

export async function rotateRefreshSession({ refreshToken, ip, userAgent }) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      throw new ApiError(401, 'Your session has expired. Please log in again.');
    }
    throw error;
  }

  if (payload.type !== 'refresh' || !payload.sid || !payload.family || !payload.sub) {
    throw new ApiError(401, 'Your session has expired. Please log in again.');
  }

  const session = await RefreshSession.findOne({ jti: payload.sid }).select('+tokenHash');
  const presentedHash = hashToken(refreshToken);

  if (
    !session ||
    session.user.toString() !== payload.sub ||
    session.familyId !== payload.family ||
    session.revokedAt ||
    session.rotatedAt ||
    session.expiresAt.getTime() <= Date.now() ||
    !tokenHashesMatch(session.tokenHash, presentedHash)
  ) {
    await RefreshSession.updateMany(
      { familyId: payload.family, revokedAt: null },
      { revokedAt: new Date(), revocationReason: 'refresh_token_reuse_or_invalid' },
    );
    throw new ApiError(401, 'Your session has expired. Please log in again.');
  }

  const user = await User.findById(payload.sub);
  if (!user || user.accountStatus !== 'active') {
    throw new ApiError(401, 'Your session has expired. Please log in again.');
  }

  const nextSessionId = createTokenId();
  const claimed = await RefreshSession.updateOne(
    {
      _id: session._id,
      tokenHash: presentedHash,
      revokedAt: null,
      rotatedAt: null,
      expiresAt: { $gt: new Date() },
    },
    {
      rotatedAt: new Date(),
      replacedByJti: nextSessionId,
      lastUsedAt: new Date(),
      lastUsedIp: ip,
    },
  );

  if (claimed.modifiedCount !== 1) {
    await RefreshSession.updateMany(
      { familyId: session.familyId, revokedAt: null },
      { revokedAt: new Date(), revocationReason: 'concurrent_refresh_or_reuse' },
    );
    throw new ApiError(401, 'Your session has expired. Please log in again.');
  }

  try {
    const nextTokens = await createSession({
      user,
      ip,
      userAgent,
      familyId: session.familyId,
      sessionId: nextSessionId,
    });
    return { user: await serializeUser(user), ...nextTokens };
  } catch (error) {
    await RefreshSession.updateMany(
      { familyId: session.familyId, revokedAt: null },
      { revokedAt: new Date(), revocationReason: 'refresh_rotation_failed' },
    );
    throw error;
  }
}
export async function revokeSessionByToken(refreshToken, reason = 'logout') {
  if (!refreshToken) return;
  try {
    const payload = verifyRefreshToken(refreshToken);
    await RefreshSession.updateOne(
      { jti: payload.sid, revokedAt: null },
      { revokedAt: new Date(), revocationReason: reason },
    );
  } catch {
    // Cookie clearing must still succeed for malformed or expired tokens.
  }
}

export async function revokeAllUserSessions(userId, reason = 'logout_all') {
  await RefreshSession.updateMany(
    { user: userId, revokedAt: null },
    { revokedAt: new Date(), revocationReason: reason },
  );
}

export async function listUserSessions(userId, currentSessionId) {
  const sessions = await RefreshSession.find({
    user: userId,
    revokedAt: null,
    rotatedAt: null,
    expiresAt: { $gt: new Date() },
  })
    .sort({ createdAt: -1 })
    .lean();

  return sessions.map((session) => ({
    id: session.jti,
    current: session.jti === currentSessionId,
    createdAt: session.createdAt,
    lastUsedAt: session.lastUsedAt,
    userAgent: session.userAgent,
    lastUsedIp: session.lastUsedIp,
  }));
}

export async function revokeUserSession(userId, sessionId) {
  const result = await RefreshSession.updateOne(
    { user: userId, jti: sessionId, revokedAt: null },
    { revokedAt: new Date(), revocationReason: 'user_revoked' },
  );
  if (result.matchedCount === 0) throw new ApiError(404, 'Session not found.');
}

export async function beginPasswordReset({ email, ip }) {
  const user = await User.findOne({ email });
  if (!user || !user.emailVerifiedAt) return {};

  const token = await createVerificationToken({
    user,
    type: 'password_reset',
    ip,
    ttlMs: environment.auth.passwordResetTtlMs,
  });
  const delivery = await sendPasswordResetEmail({ user, token });
  return { developmentUrl: delivery.developmentUrl };
}

export async function resetPassword({ token, password }) {
  const tokenRecord = await VerificationToken.findOne({
    tokenHash: hashToken(token),
    type: 'password_reset',
    consumedAt: null,
    expiresAt: { $gt: new Date() },
  });
  if (!tokenRecord) throw new ApiError(400, 'The password-reset link is invalid or expired.');

  const user = await User.findById(tokenRecord.user).select('+passwordHash');
  if (!user) throw new ApiError(400, 'The password-reset link is invalid or expired.');

  user.passwordHash = await bcrypt.hash(password, environment.auth.bcryptRounds);
  user.passwordChangedAt = new Date();
  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  if (user.accountStatus === 'locked') user.accountStatus = 'active';
  tokenRecord.consumedAt = new Date();

  await user.save();
  await tokenRecord.save();
  await revokeAllUserSessions(user._id, 'password_reset');
}

export async function beginEmailChange({ userId, newEmail, currentPassword, ip }) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw new ApiError(404, 'Account not found.');

  const passwordMatches = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!passwordMatches) {
    throw new ApiError(400, 'The current password is incorrect.');
  }

  if (user.email === newEmail) {
    throw new ApiError(400, 'The new email address must be different.');
  }

  const emailInUse = await User.exists({ email: newEmail, _id: { $ne: user._id } });
  if (emailInUse) {
    throw new ApiError(409, 'That email address cannot be used.');
  }

  const token = await createVerificationToken({
    user,
    type: 'email_change',
    ip,
    ttlMs: environment.auth.emailVerificationTtlMs,
    additionalData: { newEmail },
  });
  const delivery = await sendEmailChangeVerification({ user, newEmail, token });
  return { developmentUrl: delivery.developmentUrl };
}

export async function completeEmailChange(token) {
  const tokenRecord = await VerificationToken.findOne({
    tokenHash: hashToken(token),
    type: 'email_change',
    consumedAt: null,
    expiresAt: { $gt: new Date() },
  }).select('+newEmail');

  if (!tokenRecord?.newEmail) {
    throw new ApiError(400, 'The email-change link is invalid or expired.');
  }

  const user = await User.findById(tokenRecord.user);
  if (!user) throw new ApiError(400, 'The email-change link is invalid or expired.');

  const emailInUse = await User.exists({
    email: tokenRecord.newEmail,
    _id: { $ne: user._id },
  });
  if (emailInUse) throw new ApiError(409, 'That email address cannot be used.');

  const previousEmail = user.email;
  user.email = tokenRecord.newEmail;
  user.emailVerifiedAt = new Date();
  tokenRecord.consumedAt = new Date();

  await user.save();
  await tokenRecord.save();
  await revokeAllUserSessions(user._id, 'email_changed');

  await sendEmailChangedNotice({ user, previousEmail });
  await createNotificationSafely({
    recipient: user._id,
    type: NOTIFICATION_TYPES.SECURITY,
    category: NOTIFICATION_CATEGORIES.SECURITY,
    title: 'Email address changed',
    message: 'Your account email address was changed and all previous sessions were revoked.',
    actionUrl: '/dashboard/account',
  });
}

export async function changePassword({ userId, currentPassword, newPassword }) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw new ApiError(404, 'Account not found.');

  const matches = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!matches) throw new ApiError(400, 'The current password is incorrect.');
  if (currentPassword === newPassword) {
    throw new ApiError(400, 'The new password must be different from the current password.');
  }

  user.passwordHash = await bcrypt.hash(newPassword, environment.auth.bcryptRounds);
  user.passwordChangedAt = new Date();
  await user.save();
  await revokeAllUserSessions(user._id, 'password_changed');
  await createNotificationSafely({
    recipient: user._id,
    type: NOTIFICATION_TYPES.SECURITY,
    category: NOTIFICATION_CATEGORIES.SECURITY,
    title: 'Password changed',
    message: 'Your account password was changed and all previous sessions were revoked.',
    actionUrl: '/dashboard/account',
  });
}

export { serializeUser };
