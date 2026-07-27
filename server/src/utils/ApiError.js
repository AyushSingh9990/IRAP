class ApiError extends Error {
  constructor(statusCode, message, errors = [], options = {}) {
    super(message, options);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errors = Array.isArray(errors) ? errors : [];
    this.isOperational = true;

    Error.captureStackTrace?.(this, this.constructor);
  }
}

export { ApiError };
export default ApiError;
