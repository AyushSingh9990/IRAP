import app from './src/app.js';
import { connectDatabase } from './src/config/database.js';
import { logger } from './src/config/logger.js';

function isHealthRequest(request) {
  const requestUrl = request.originalUrl || request.url || '';

  return requestUrl.startsWith('/api/v1/health');
}

/**
 * Vercel production entrypoint.
 *
 * Do not call app.listen() here. Vercel supplies the request and
 * response objects and manages the HTTP server lifecycle.
 */
export default async function handler(request, response) {
  /**
   * Allow CORS preflight and health requests to reach Express without
   * forcing a database connection first.
   */
  const databaseConnectionRequired =
    request.method !== 'OPTIONS' && !isHealthRequest(request);

  if (databaseConnectionRequired) {
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