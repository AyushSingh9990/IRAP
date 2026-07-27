import http from 'node:http';

import app from './app.js';
import {
  connectDatabase,
  disconnectDatabase,
} from './config/database.js';
import { environment } from './config/environment.js';
import { logger } from './config/logger.js';

const server = http.createServer(app);
let isShuttingDown = false;

function closeHttpServer() {
  if (!server.listening) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error && error.code !== 'ERR_SERVER_NOT_RUNNING') {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function shutdown(signal, exitCode = 0) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  logger.info({ signal }, 'Server shutdown initiated');

  const forceShutdownTimer = setTimeout(() => {
    logger.fatal('Forced server shutdown after timeout');
    process.exit(1);
  }, 10000);

  forceShutdownTimer.unref();

  try {
    await closeHttpServer();
    await disconnectDatabase();

    clearTimeout(forceShutdownTimer);
    logger.info('Server shutdown completed');
    process.exit(exitCode);
  } catch (error) {
    clearTimeout(forceShutdownTimer);
    logger.error({ error }, 'Server shutdown failed');
    process.exit(1);
  }
}

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    logger.fatal(
      { error, port: environment.port },
      `Port ${environment.port} is already in use.`,
    );
  } else {
    logger.fatal({ error }, 'HTTP server failed');
  }

  void shutdown('serverError', 1);
});

function startServer() {
  server.listen(environment.port, () => {
    logger.info(
      {
        port: environment.port,
        environment: environment.nodeEnv,
        apiBaseUrl: `${environment.serverUrl}/api/v1`,
      },
      'iRAP API server started',
    );

    void connectDatabase();
  });
}

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('uncaughtException', (error) => {
  logger.fatal({ error }, 'Uncaught exception');
  void shutdown('uncaughtException', 1);
});

process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'Unhandled promise rejection');
  void shutdown('unhandledRejection', 1);
});

startServer();
