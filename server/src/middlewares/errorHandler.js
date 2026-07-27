import mongoose from 'mongoose';

import { environment } from '../config/environment.js';
import { logger } from '../config/logger.js';

function mongooseValidationErrors(error) {
  return Object.values(error?.errors ?? {}).map((entry) => ({
    field: entry?.path || 'request',
    message: entry?.message || 'The supplied value is invalid.',
  }));
}

function isInstanceOf(error, ErrorConstructor) {
  return (
    typeof ErrorConstructor === 'function' &&
    error instanceof ErrorConstructor
  );
}

function isServerSelectionError(error) {
  return (
    isInstanceOf(error, mongoose.Error?.MongooseServerSelectionError) ||
    error?.name === 'MongooseServerSelectionError' ||
    /MongoServerSelectionError|MongooseServerSelectionError|buffering timed out|ECONNREFUSED|ENOTFOUND/i.test(
      `${error?.name ?? ''} ${error?.message ?? ''}`,
    )
  );
}

function mapDatabaseError(error) {
  if (error?.code === 11000) {
    return {
      statusCode: 409,
      message: 'A record with the supplied information already exists.',
      errors: Object.keys(error?.keyPattern ?? { email: 1 }).map((field) => ({
        field,
        message: `${field} is already in use.`,
      })),
    };
  }

  if (error?.code === 13 || error?.codeName === 'Unauthorized') {
    return {
      statusCode: 503,
      message:
        'MongoDB is connected, but the database user does not have permission to perform this operation.',
      errors: [],
    };
  }

  if (error?.code === 18 || error?.codeName === 'AuthenticationFailed') {
    return {
      statusCode: 503,
      message: 'MongoDB rejected the configured database username or password.',
      errors: [],
    };
  }

  if (
    [85, 86].includes(error?.code) ||
    /IndexOptionsConflict|IndexKeySpecsConflict/i.test(error?.message ?? '')
  ) {
    return {
      statusCode: 503,
      message:
        'MongoDB has an index that conflicts with the current schema.',
      errors: [],
    };
  }

  if (isServerSelectionError(error)) {
    return {
      statusCode: 503,
      message: 'MongoDB is not currently reachable from the iRAP server.',
      errors: [],
    };
  }

  return null;
}

export function errorHandler(error, request, response, next) {
  if (response.headersSent) {
    next(error);
    return;
  }

  let statusCode = Number.isInteger(error?.statusCode)
    ? error.statusCode
    : 500;
  let errors = Array.isArray(error?.errors) ? error.errors : [];
  let operationalMessage =
    error?.message || 'The request could not be completed.';

  const databaseError = mapDatabaseError(error);

  if (error?.type === 'entity.too.large' || error?.statusCode === 413) {
    statusCode = 413;
    operationalMessage = 'The request body exceeds the permitted size.';
    errors = [];
  } else if (error?.type === 'entity.parse.failed') {
    statusCode = 400;
    operationalMessage = 'The JSON request body is malformed.';
    errors = [];
  } else if (error?.name === 'MulterError') {
    statusCode = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    operationalMessage =
      error.code === 'LIMIT_FILE_SIZE'
        ? `The selected file exceeds the ${environment.documentStorage.maxFileSizeMb} MB limit.`
        : 'The document upload could not be processed.';
  } else if (databaseError) {
    statusCode = databaseError.statusCode;
    operationalMessage = databaseError.message;
    errors = databaseError.errors;
  } else if (
    isInstanceOf(error, mongoose.Error?.ValidationError) ||
    error?.name === 'ValidationError'
  ) {
    statusCode = 422;
    operationalMessage = 'The submitted data did not pass database validation.';
    errors = mongooseValidationErrors(error);
  } else if (
    isInstanceOf(error, mongoose.Error?.CastError) ||
    error?.name === 'CastError'
  ) {
    statusCode = 400;
    operationalMessage = 'The supplied identifier is invalid.';
  }

  const isServerError = statusCode >= 500;

  if (isServerError) {
    logger.error(
      {
        error,
        requestId: request.id,
        method: request.method,
        url: request.originalUrl,
      },
      'Unhandled request error',
    );
  }

  const payload = {
    success: false,
    message:
      isServerError && environment.isProduction
        ? 'An unexpected server error occurred.'
        : operationalMessage,
    errors,
    requestId: request.id,
  };

  if (!environment.isProduction && isServerError) {
    payload.debug = {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      codeName: error?.codeName,
    };
  }

  response.status(statusCode).json(payload);
}
