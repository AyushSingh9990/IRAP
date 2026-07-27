import crypto from 'node:crypto';

function secret() {
  return crypto.randomBytes(48).toString('base64url');
}

console.log('JWT_ACCESS_SECRET=' + secret());
console.log('JWT_REFRESH_SECRET=' + secret());
