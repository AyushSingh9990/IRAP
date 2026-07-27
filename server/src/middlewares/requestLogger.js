import { randomUUID } from 'node:crypto';
import pinoHttp from 'pino-http';
import { logger } from '../config/logger.js';

export const requestLogger = pinoHttp({
  logger,
  genReqId(request, response) {
    const existingRequestId = request.headers['x-request-id'];
    const normalizedRequestId =
      typeof existingRequestId === 'string' ? existingRequestId.trim() : '';
    const requestId = /^[A-Za-z0-9._:-]{1,128}$/.test(normalizedRequestId)
      ? normalizedRequestId
      : randomUUID();

    response.setHeader('X-Request-Id', requestId);
    return requestId;
  },
  customLogLevel(_request, response, error) {
    if (error || response.statusCode >= 500) {
      return 'error';
    }

    if (response.statusCode >= 400) {
      return 'warn';
    }

    return 'info';
  },
  serializers: {
    req(request) {
      return {
        id: request.id,
        method: request.method,
        url: request.url,
        remoteAddress: request.remoteAddress,
      };
    },
    res(response) {
      return {
        statusCode: response.statusCode,
      };
    },
  },
});
