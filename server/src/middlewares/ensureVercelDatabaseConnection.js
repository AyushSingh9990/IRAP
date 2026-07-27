import { connectDatabase } from '../config/database.js';
import { logger } from '../config/logger.js';

const IS_VERCEL_RUNTIME = process.env.VERCEL === '1';

export async function ensureVercelDatabaseConnection(
  request,
  response,
  next,
) {
  if (!IS_VERCEL_RUNTIME || request.method === 'OPTIONS') {
    next();
    return;
  }

  try {
    const connected = await connectDatabase();

    if (!connected) {
      logger.error(
        {
          method: request.method,
          path: request.originalUrl || request.url,
        },
        'MongoDB is unavailable for the Vercel request',
      );

      response.status(503).json({
        success: false,
        message: 'The database service is temporarily unavailable.',
        errors: [],
      });

      return;
    }

    next();
  } catch (error) {
    logger.error(
      {
        err: error,
        method: request.method,
        path: request.originalUrl || request.url,
      },
      'MongoDB connection failed for the Vercel request',
    );

    response.status(503).json({
      success: false,
      message: 'The database service is temporarily unavailable.',
      errors: [],
    });
  }
}