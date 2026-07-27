import mongoose from 'mongoose';

import { environment } from './environment.js';
import { logger } from './logger.js';

mongoose.set('strictQuery', true);

const PLACEHOLDER_FRAGMENTS = [
  'username',
  'password',
  'cluster.mongodb.net',
  '<db_password>',
  '<username>',
  '<password>',
];

const RETRY_DELAY_MS = 15000;
const IS_VERCEL_RUNTIME = process.env.VERCEL === '1';

let reconnectTimer = null;
let connectionAttempt = null;
let shuttingDown = false;

/**
 * Checks whether a real MongoDB connection string has been configured.
 */
function hasUsableMongoUri() {
  const mongoUri = environment.mongodbUri?.trim();

  if (!mongoUri) {
    return false;
  }

  const normalizedMongoUri = mongoUri.toLowerCase();

  return !PLACEHOLDER_FRAGMENTS.some((fragment) =>
    normalizedMongoUri.includes(fragment),
  );
}

/**
 * Clears the reconnect timer used by traditional Node deployments.
 */
function clearReconnectTimer() {
  if (!reconnectTimer) {
    return;
  }

  clearTimeout(reconnectTimer);
  reconnectTimer = null;
}

/**
 * Schedules database reconnection for persistent Node processes.
 *
 * Vercel Functions must not depend on long-running background timers.
 * A later Vercel request will retry the connection automatically.
 */
function scheduleReconnect() {
  if (
    IS_VERCEL_RUNTIME ||
    shuttingDown ||
    reconnectTimer ||
    mongoose.connection.readyState === 1
  ) {
    return;
  }

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    void connectDatabase();
  }, RETRY_DELAY_MS);

  reconnectTimer.unref?.();

  logger.warn(
    {
      retryInSeconds: RETRY_DELAY_MS / 1000,
      runtime: 'node',
    },
    'MongoDB reconnect scheduled',
  );
}

/**
 * Waits for an existing Mongoose connection attempt when Mongoose is
 * already in its connecting state.
 */
async function waitForExistingConnection() {
  try {
    await mongoose.connection.asPromise();

    return mongoose.connection.readyState === 1;
  } catch (error) {
    logger.error(
      {
        err: error,
        runtime: IS_VERCEL_RUNTIME ? 'vercel' : 'node',
      },
      'Existing MongoDB connection attempt failed',
    );

    return false;
  }
}

/**
 * Connects the application to MongoDB.
 *
 * Returns:
 * - true when MongoDB is connected
 * - false when MongoDB is unavailable or not configured
 */
export async function connectDatabase() {
  if (shuttingDown) {
    return false;
  }

  if (!hasUsableMongoUri()) {
    const message =
      'MongoDB is not configured. Database-backed workflows are unavailable.';

    if (environment.databaseRequired) {
      logger.error(
        {
          databaseRequired: true,
          runtime: IS_VERCEL_RUNTIME ? 'vercel' : 'node',
        },
        message,
      );
    } else {
      logger.warn(
        {
          databaseRequired: false,
          runtime: IS_VERCEL_RUNTIME ? 'vercel' : 'node',
        },
        message,
      );
    }

    return false;
  }

  /**
   * Reuse an existing MongoDB connection.
   */
  if (mongoose.connection.readyState === 1) {
    clearReconnectTimer();
    return true;
  }

  /**
   * Prevent simultaneous requests from opening duplicate connections.
   */
  if (connectionAttempt) {
    return connectionAttempt;
  }

  /**
   * Wait when Mongoose is already connecting.
   */
  if (mongoose.connection.readyState === 2) {
    return waitForExistingConnection();
  }

  connectionAttempt = (async () => {
    try {
      await mongoose.connect(environment.mongodbUri, {
        dbName: environment.databaseName,

        /**
         * Production indexes should be managed through controlled
         * migrations or administration scripts.
         */
        autoIndex: !environment.isProduction,

        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000,

        /**
         * Keep the pool smaller on Vercel because multiple Function
         * instances may run simultaneously.
         */
        maxPoolSize: IS_VERCEL_RUNTIME ? 5 : 10,
        minPoolSize: 0,
        maxIdleTimeMS: 60000,
      });

      clearReconnectTimer();

      logger.info(
        {
          database: environment.databaseName,
          host: mongoose.connection.host,
          runtime: IS_VERCEL_RUNTIME ? 'vercel' : 'node',
          poolSize: IS_VERCEL_RUNTIME ? 5 : 10,
        },
        'MongoDB connection established',
      );

      return true;
    } catch (error) {
      logger.error(
        {
          err: error,
          databaseRequired: environment.databaseRequired,
          runtime: IS_VERCEL_RUNTIME ? 'vercel' : 'node',
        },
        IS_VERCEL_RUNTIME
          ? 'MongoDB connection failed in the Vercel runtime'
          : 'MongoDB connection failed; the API will stay online and retry',
      );

      /**
       * On Vercel, scheduleReconnect does nothing.
       * A later request will attempt the connection again.
       */
      scheduleReconnect();

      return false;
    } finally {
      connectionAttempt = null;
    }
  })();

  return connectionAttempt;
}

mongoose.connection.on('connected', () => {
  clearReconnectTimer();
});

mongoose.connection.on('disconnected', () => {
  if (shuttingDown) {
    return;
  }

  logger.warn(
    {
      runtime: IS_VERCEL_RUNTIME ? 'vercel' : 'node',
    },
    'MongoDB disconnected',
  );

  scheduleReconnect();
});

mongoose.connection.on('error', (error) => {
  logger.error(
    {
      err: error,
      runtime: IS_VERCEL_RUNTIME ? 'vercel' : 'node',
    },
    'MongoDB connection error',
  );
});

/**
 * Closes MongoDB during shutdown of a persistent Node server.
 *
 * Do not call this after individual Vercel requests. Warm Vercel
 * Function instances should reuse the connection.
 */
export async function disconnectDatabase() {
  shuttingDown = true;
  clearReconnectTimer();

  if (connectionAttempt) {
    try {
      await connectionAttempt;
    } catch {
      // The connection failure was already logged.
    }
  }

  connectionAttempt = null;

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();

    logger.info(
      {
        runtime: IS_VERCEL_RUNTIME ? 'vercel' : 'node',
      },
      'MongoDB connection closed',
    );
  }
}

/**
 * Returns a safe database-health summary.
 */
export function getDatabaseHealth() {
  if (!hasUsableMongoUri()) {
    return {
      status: 'not_configured',
      readyState: mongoose.connection.readyState,
      required: environment.databaseRequired,
      runtime: IS_VERCEL_RUNTIME ? 'vercel' : 'node',
    };
  }

  const stateNames = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  return {
    status: stateNames[mongoose.connection.readyState] || 'unknown',
    readyState: mongoose.connection.readyState,
    required: environment.databaseRequired,
    runtime: IS_VERCEL_RUNTIME ? 'vercel' : 'node',
  };
}