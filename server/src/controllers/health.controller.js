import { getDatabaseHealth } from '../config/database.js';
import { environment } from '../config/environment.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export function getHealth(_request, response) {
  const database = getDatabaseHealth();
  const databaseAvailable = database.status === 'connected';
  const isHealthy = databaseAvailable || !database.required;

  let message = 'iRAP API is healthy.';

  if (!databaseAvailable && !database.required) {
    message =
      'iRAP API is running in foundation mode. MongoDB-backed workflows are disabled until configured.';
  } else if (!databaseAvailable) {
    message = 'iRAP API is running but the required database is unavailable.';
  }

  return response.status(isHealthy ? 200 : 503).json(
    new ApiResponse({
      message,
      data: {
        service: 'irap-server',
        environment: environment.nodeEnv,
        database: database.status,
        databaseRequired: database.required,
        authenticationEnabled: environment.authEnabled,
        payments: {
          enabled: environment.payments.enabled,
          defaultProvider: environment.payments.defaultProvider,
          providers: {
            razorpay: environment.payments.razorpay.enabled,
            stripe: environment.payments.stripe.enabled,
            offline: environment.payments.offline.enabled,
          },
        },
        registry: {
          memberships: true,
          certificates: true,
          renewals: true,
          publicVerification: true,
        },
        documentStorage: {
          provider: environment.documentStorage.provider,
          configured:
            environment.documentStorage.provider === 'local' ||
            environment.documentStorage.cloudinaryConfigured,
          maxFileSizeMb: environment.documentStorage.maxFileSizeMb,
        },
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      },
    }),
  );
}
