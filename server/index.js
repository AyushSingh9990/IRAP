import app from './src/app.js';
import { connectDatabase } from './src/config/database.js';
import { logger } from './src/config/logger.js';

export default async function handler(request, response) {
  // CORS preflight requests do not require MongoDB.
  if (request.method !== 'OPTIONS') {
    const connected = await connectDatabase();

    if (!connected) {
      logger.error(
        {
          method: request.method,
          path: request.originalUrl || request.url,
        },
        'Request rejected because MongoDB is unavailable',
      );

      return response.status(503).json({
        success: false,
        message: 'The database service is temporarily unavailable.',
        errors: [],
      });
    }
  }

  return app(request, response);
}