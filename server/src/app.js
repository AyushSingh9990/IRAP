import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
import { environment } from './config/environment.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { notFound } from './middlewares/notFound.js';
import { requestLogger } from './middlewares/requestLogger.js';
import { responseCachePolicy } from './middlewares/responseCachePolicy.js';
import { securityHeaders } from './middlewares/securityHeaders.js';
import { verifyRequestOrigin } from './middlewares/verifyOrigin.js';
import applicationRouter from './routes/application.routes.js';
import articleRouter from './routes/article.routes.js';
import adminRouter from './routes/admin.routes.js';
import authRouter from './routes/auth.routes.js';
import healthRouter from './routes/health.routes.js';
import documentRouter from './routes/document.routes.js';
import directoryRouter from './routes/directory.routes.js';
import courseRouter from './routes/course.routes.js';
import dashboardRouter from './routes/dashboard.routes.js';
import notificationRouter from './routes/notification.routes.js';
import paymentRouter from './routes/payment.routes.js';
import paymentWebhookRouter from './routes/payment.webhook.routes.js';
import reviewRouter from './routes/review.routes.js';
import membershipRouter from './routes/membership.routes.js';
import verificationRouter from './routes/verification.routes.js';
import siteRouter from './routes/site.routes.js';
import { ApiError } from './utils/ApiError.js';
import { ApiResponse } from './utils/ApiResponse.js';

const app = express();

app.set('trust proxy', environment.trustProxy);
app.disable('x-powered-by');

app.use(requestLogger);
app.use(securityHeaders);
app.use(responseCachePolicy);
app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || environment.clientUrls.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new ApiError(403, 'The request origin is not allowed.'));
    },
  }),
);
app.use(verifyRequestOrigin);
app.use(compression());
app.use(hpp());
app.use(cookieParser());

const paymentWebhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { received: false },
});

app.use(
  '/api/v1/payments/webhooks',
  paymentWebhookLimiter,
  express.raw({ type: 'application/json', limit: '1mb' }),
  paymentWebhookRouter,
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(mongoSanitize({ replaceWith: '_' }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
    errors: [],
  },
});

app.use('/api/v1', apiLimiter);

app.get('/api/v1', (_request, response) => {
  response.status(200).json(
    new ApiResponse({
      message: 'iRAP API foundation is available.',
      data: { version: 'v1', authenticationEnabled: environment.authEnabled },
    }),
  );
});

app.use('/api/v1/health', healthRouter);
app.use('/api/v1/verification', verificationRouter);
app.use('/api/v1/site', siteRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/applications', applicationRouter);
app.use('/api/v1/articles', articleRouter);
app.use('/api/v1/documents', documentRouter);
app.use('/api/v1/dashboard', dashboardRouter);
app.use('/api/v1/notifications', notificationRouter);
app.use('/api/v1/payments', paymentRouter);
app.use('/api/v1/admin/reviews', reviewRouter);
app.use('/api/v1/memberships', membershipRouter);
app.use('/api/v1/directories', directoryRouter);
app.use('/api/v1/courses', courseRouter);
app.use('/api/v1/admin', adminRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
