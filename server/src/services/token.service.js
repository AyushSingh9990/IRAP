import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import { environment } from '../config/environment.js';

export function createOpaqueToken() {
  return crypto.randomBytes(48).toString('base64url');
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function tokenHashesMatch(first, second) {
  if (typeof first !== 'string' || typeof second !== 'string') return false;
  const firstBuffer = Buffer.from(first, 'hex');
  const secondBuffer = Buffer.from(second, 'hex');
  return (
    firstBuffer.length === secondBuffer.length &&
    crypto.timingSafeEqual(firstBuffer, secondBuffer)
  );
}

export function createTokenId() {
  return nanoid(32);
}

export function signAccessToken({ userId, roles, permissions, sessionId }) {
  return jwt.sign(
    {
      type: 'access',
      roles,
      permissions,
      sid: sessionId,
    },
    environment.jwt.accessSecret,
    {
      subject: userId,
      expiresIn: environment.jwt.accessExpiresIn,
      issuer: environment.jwt.issuer,
      audience: environment.jwt.audience,
      jwtid: createTokenId(),
      algorithm: 'HS256',
    },
  );
}

export function signRefreshToken({ userId, sessionId, familyId }) {
  return jwt.sign(
    {
      type: 'refresh',
      sid: sessionId,
      family: familyId,
    },
    environment.jwt.refreshSecret,
    {
      subject: userId,
      expiresIn: environment.jwt.refreshExpiresIn,
      issuer: environment.jwt.issuer,
      audience: environment.jwt.audience,
      jwtid: sessionId,
      algorithm: 'HS256',
    },
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, environment.jwt.accessSecret, {
    algorithms: ['HS256'],
    issuer: environment.jwt.issuer,
    audience: environment.jwt.audience,
  });
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, environment.jwt.refreshSecret, {
    algorithms: ['HS256'],
    issuer: environment.jwt.issuer,
    audience: environment.jwt.audience,
  });
}

export function getRefreshExpiryDate() {
  return new Date(Date.now() + environment.jwt.refreshMaxAgeMs);
}
