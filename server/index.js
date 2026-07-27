import app from './src/app.js';
import { connectDatabase } from './src/config/database.js';
import { logger } from './src/config/logger.js';

export default async function handler(request, response) {
  // OPTIONS requests are only browser preflight checks.
  if (request.method === 'OPTIONS') {
    return app(request, response);
  }

  try {
    const connected = await connectDatabase();

    if (!connected) {
      logger.error(
        {
          method: request.method,
          path: request.originalUrl || request.url,
        },
        'MongoDB connection returned unavailable in Vercel',
      );

      return response.status(503).json({
        success: false,
        message: 'The database service is temporarily unavailable.',
        errors: [],
      });
    }

    return app(request, response);
  } catch (error) {
    logger.error(
      {
        err: error,
        method: request.method,
        path: request.originalUrl || request.url,
      },
      'MongoDB connection failed in Vercel',
    );

    return response.status(503).json({
      success: false,
      message: 'The database service is temporarily unavailable.',
      errors: [],
    });
  }
}