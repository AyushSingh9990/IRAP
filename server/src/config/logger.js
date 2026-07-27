import pino from 'pino';
import { environment } from './environment.js';

export const logger = pino({
  level: environment.logLevel,
  base: {
    service: 'irap-server',
    environment: environment.nodeEnv,
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      '*.password',
      '*.token',
      '*.secret',
    ],
    censor: '[REDACTED]',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});
