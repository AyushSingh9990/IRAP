import jwt from 'jsonwebtoken';
import { environment } from '../config/environment.js';
import RefreshSession from '../models/RefreshSession.js';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { verifyAccessToken } from '../services/token.service.js';
import { resolveUserPermissions } from '../services/rolePermission.service.js';

export async function authenticate(request, _response, next) {
  const token = request.cookies[environment.cookie.accessName];
  if (!token) {
    next(new ApiError(401, 'Authentication is required.'));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    if (payload.type !== 'access' || !payload.sub) {
      next(new ApiError(401, 'Authentication is required.'));
      return;
    }

    const [user, session] = await Promise.all([
      User.findById(payload.sub),
      RefreshSession.findOne({
        jti: payload.sid,
        user: payload.sub,
        revokedAt: null,
        rotatedAt: null,
        expiresAt: { $gt: new Date() },
      }).select('_id'),
    ]);

    if (!user || !session || user.accountStatus !== 'active') {
      next(new ApiError(401, 'Authentication is required.'));
      return;
    }

    if (
      user.passwordChangedAt &&
      payload.iat * 1000 < user.passwordChangedAt.getTime() - 1000
    ) {
      next(new ApiError(401, 'Authentication is required.'));
      return;
    }

    const permissions = await resolveUserPermissions(user);
    request.auth = {
      user,
      userId: user.id,
      sessionId: payload.sid,
      roles: user.roles,
      permissions,
    };
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      next(new ApiError(401, 'Authentication is required.'));
      return;
    }
    next(error);
  }
}
