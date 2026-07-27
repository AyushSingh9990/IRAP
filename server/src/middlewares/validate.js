import { ApiError } from '../utils/ApiError.js';

export function validate(schema) {
  return (request, _response, next) => {
    const result = schema.safeParse({
      body: request.body,
      params: request.params,
      query: request.query,
    });

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.slice(1).join('.') || 'request',
        message: issue.message,
      }));

      next(new ApiError(422, 'Validation failed.', errors));
      return;
    }

    request.validated = result.data;
    next();
  };
}
