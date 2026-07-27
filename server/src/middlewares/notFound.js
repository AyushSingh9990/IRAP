import { ApiError } from '../utils/ApiError.js';

export function notFound(request, _response, next) {
  next(
    new ApiError(
      404,
      `Route ${request.method} ${request.originalUrl} was not found.`,
    ),
  );
}
