import { environment } from '../config/environment.js';
import { ApiError } from '../utils/ApiError.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function verifyRequestOrigin(request, _response, next) {
  if (SAFE_METHODS.has(request.method)) {
    next();
    return;
  }

  const origin = request.get('origin');
  const fetchSite = request.get('sec-fetch-site');

  if (fetchSite === 'cross-site') {
    next(new ApiError(403, 'The request origin is not allowed.'));
    return;
  }

  if (!origin || environment.clientUrls.includes(origin)) {
    next();
    return;
  }

  next(new ApiError(403, 'The request origin is not allowed.'));
}
