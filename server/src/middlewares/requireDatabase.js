import mongoose from 'mongoose';
import { environment } from '../config/environment.js';
import { ApiError } from '../utils/ApiError.js';

export function requireDatabase(_request, _response, next) {
  if (mongoose.connection.readyState !== 1) {
    next(
      new ApiError(
        503,
        'The database service is temporarily unavailable.',
      ),
    );
    return;
  }

  next();
}

export function requireAuthenticationService(request, response, next) {
  if (!environment.authEnabled) {
    next(
      new ApiError(
        503,
        'Authentication is not configured. Enable it after adding MongoDB and JWT settings.',
      ),
    );
    return;
  }

  requireDatabase(request, response, next);
}
