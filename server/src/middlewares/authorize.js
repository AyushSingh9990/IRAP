import { ApiError } from '../utils/ApiError.js';

export function authorizeRoles(...allowedRoles) {
  return (request, _response, next) => {
    const permitted = allowedRoles.some((role) => request.auth?.roles.includes(role));
    if (!permitted) {
      next(new ApiError(403, 'You do not have permission to perform this action.'));
      return;
    }
    next();
  };
}

export function authorizePermissions(...requiredPermissions) {
  return (request, _response, next) => {
    const permitted = requiredPermissions.every((permission) =>
      request.auth?.permissions.includes(permission),
    );
    if (!permitted) {
      next(new ApiError(403, 'You do not have permission to perform this action.'));
      return;
    }
    next();
  };
}
