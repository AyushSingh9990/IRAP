import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

const serverRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);

const isTestRuntime =
  process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';

// Vitest provides an isolated environment through vitest.config.js. Loading the
// developer's real server/.env during tests can leak enabled production features
// (for example PAYMENTS_ENABLED=true) into foundation/unit tests and make the
// test configuration internally inconsistent.
if (!isTestRuntime) {
  dotenv.config({
    path: path.join(serverRoot, '.env'),
    quiet: true,
  });
}

const booleanFromString = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true');

const clientUrlListSchema = z.string().min(1).superRefine((value, context) => {
  const urls = value
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean);

  if (urls.length === 0) {
    context.addIssue({ code: 'custom', message: 'At least one CLIENT_URL is required.' });
    return;
  }

  for (const url of urls) {
    if (!z.string().url().safeParse(url).success) {
      context.addIssue({ code: 'custom', message: `Invalid CLIENT_URL value: ${url}` });
    }
  }
});

function durationToMilliseconds(value, fieldName) {
  const match = /^(\d+)(ms|s|m|h|d)$/.exec(value);
  if (!match) {
    throw new Error(`${fieldName} must use a duration such as 15m, 7d, or 3600s.`);
  }

  const amount = Number(match[1]);
  if (amount < 1) {
    throw new Error(`${fieldName} must be greater than zero.`);
  }
  const multipliers = { ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return amount * multipliers[match[2]];
}

const optionalSecret = z.string().trim().optional().default('');

const environmentSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(5000),
    CLIENT_URL: clientUrlListSchema,
    SERVER_URL: z.string().url(),
    DATABASE_REQUIRED: booleanFromString.default('false'),
    MONGODB_URI: z.string().trim().optional().default(''),
    DATABASE_NAME: z.string().trim().min(1).default('irap'),

    AUTH_ENABLED: booleanFromString.default('false'),
    APPLICATION_PAYMENT_REQUIRED: booleanFromString.default('false'),
    PAYMENTS_ENABLED: booleanFromString.default('false'),
    DEFAULT_CURRENCY: z.string().trim().regex(/^[A-Za-z]{3}$/).default('INR'),
    PAYMENT_DEFAULT_PROVIDER: z.enum(['razorpay', 'stripe', 'offline']).default('offline'),
    RAZORPAY_ENABLED: booleanFromString.default('false'),
    RAZORPAY_KEY_ID: z.string().trim().optional().default(''),
    RAZORPAY_KEY_SECRET: optionalSecret,
    RAZORPAY_WEBHOOK_SECRET: optionalSecret,
    STRIPE_ENABLED: booleanFromString.default('false'),
    STRIPE_PUBLIC_KEY: z.string().trim().optional().default(''),
    STRIPE_SECRET_KEY: optionalSecret,
    STRIPE_WEBHOOK_SECRET: optionalSecret,
    OFFLINE_PAYMENT_ENABLED: booleanFromString.default('false'),
    OFFLINE_PAYMENT_INSTRUCTIONS: z.string().trim().max(3000).optional().default(''),
    OFFLINE_PAYMENT_ACCOUNT_NAME: z.string().trim().max(160).optional().default(''),
    OFFLINE_PAYMENT_ACCOUNT_REFERENCE: z.string().trim().max(240).optional().default(''),
    JWT_ACCESS_SECRET: optionalSecret,
    JWT_REFRESH_SECRET: optionalSecret,
    JWT_ACCESS_EXPIRES_IN: z.string().trim().default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().trim().default('7d'),
    JWT_ISSUER: z.string().trim().min(1).default('irap-server'),
    JWT_AUDIENCE: z.string().trim().min(1).default('irap-client'),
    BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(14).default(12),
    MAX_LOGIN_ATTEMPTS: z.coerce.number().int().min(3).max(20).default(5),
    LOGIN_LOCK_MINUTES: z.coerce.number().int().min(5).max(1440).default(15),
    EMAIL_VERIFICATION_HOURS: z.coerce.number().int().min(1).max(168).default(24),
    PASSWORD_RESET_MINUTES: z.coerce.number().int().min(5).max(180).default(30),
    TWO_FACTOR_CODE_MINUTES: z.coerce.number().int().min(2).max(30).default(10),

    DOCUMENT_STORAGE_PROVIDER: z.enum(['local', 'cloudinary']).default('local'),
    DOCUMENT_LOCAL_DIRECTORY: z.string().trim().min(1).default('private-uploads'),
    DOCUMENT_MAX_FILE_SIZE_MB: z.coerce.number().int().min(1).max(50).default(10),
    DOCUMENT_SIGNED_URL_MINUTES: z.coerce.number().int().min(1).max(60).default(10),
    CLOUDINARY_CLOUD_NAME: z.string().trim().optional().default(''),
    CLOUDINARY_API_KEY: z.string().trim().optional().default(''),
    CLOUDINARY_API_SECRET: optionalSecret,

    ACCESS_COOKIE_NAME: z.string().trim().min(1).default('irap_access'),
    REFRESH_COOKIE_NAME: z.string().trim().min(1).default('irap_refresh'),
    COOKIE_DOMAIN: z.string().trim().optional().default(''),
    COOKIE_SECURE: booleanFromString.default('false'),
    COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),

    MAIL_DELIVERY_MODE: z.enum(['log', 'smtp']).default('log'),
    SMTP_HOST: z.string().trim().optional().default(''),
    SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
    SMTP_SECURE: booleanFromString.default('false'),
    SMTP_USER: z.string().trim().optional().default(''),
    SMTP_PASSWORD: optionalSecret,
    MAIL_FROM_NAME: z.string().trim().min(1).default('iRAP'),
    MAIL_FROM_ADDRESS: z.string().trim().optional().default(''),

    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    TRUST_PROXY: z.coerce.number().int().min(0).default(1),
  })
  .superRefine((values, context) => {
    const hasMongoUri = Boolean(values.MONGODB_URI);

    if (values.DATABASE_REQUIRED && !hasMongoUri) {
      context.addIssue({
        code: 'custom',
        path: ['MONGODB_URI'],
        message: 'MONGODB_URI is required when DATABASE_REQUIRED=true.',
      });
    }

    if (values.AUTH_ENABLED) {
      if (!values.DATABASE_REQUIRED) {
        context.addIssue({
          code: 'custom',
          path: ['DATABASE_REQUIRED'],
          message: 'DATABASE_REQUIRED must be true when AUTH_ENABLED=true.',
        });
      }
      if (values.JWT_ACCESS_SECRET.length < 32) {
        context.addIssue({
          code: 'custom',
          path: ['JWT_ACCESS_SECRET'],
          message: 'JWT_ACCESS_SECRET must contain at least 32 characters.',
        });
      }
      if (values.JWT_REFRESH_SECRET.length < 32) {
        context.addIssue({
          code: 'custom',
          path: ['JWT_REFRESH_SECRET'],
          message: 'JWT_REFRESH_SECRET must contain at least 32 characters.',
        });
      }
      if (
        values.JWT_ACCESS_SECRET &&
        values.JWT_ACCESS_SECRET === values.JWT_REFRESH_SECRET
      ) {
        context.addIssue({
          code: 'custom',
          path: ['JWT_REFRESH_SECRET'],
          message: 'Access and refresh secrets must be different.',
        });
      }
    }

    if (values.APPLICATION_PAYMENT_REQUIRED && !values.PAYMENTS_ENABLED) {
      context.addIssue({
        code: 'custom',
        path: ['PAYMENTS_ENABLED'],
        message: 'PAYMENTS_ENABLED must be true when APPLICATION_PAYMENT_REQUIRED=true.',
      });
    }

    if (values.PAYMENTS_ENABLED) {
      if (!values.DATABASE_REQUIRED || !values.AUTH_ENABLED) {
        context.addIssue({
          code: 'custom',
          path: ['PAYMENTS_ENABLED'],
          message: 'Database and authentication must be enabled when PAYMENTS_ENABLED=true.',
        });
      }

      const providerStates = {
        razorpay: values.RAZORPAY_ENABLED,
        stripe: values.STRIPE_ENABLED,
        offline: values.OFFLINE_PAYMENT_ENABLED,
      };

      if (!Object.values(providerStates).some(Boolean)) {
        context.addIssue({
          code: 'custom',
          path: ['PAYMENTS_ENABLED'],
          message: 'At least one payment provider must be enabled.',
        });
      }

      if (!providerStates[values.PAYMENT_DEFAULT_PROVIDER]) {
        context.addIssue({
          code: 'custom',
          path: ['PAYMENT_DEFAULT_PROVIDER'],
          message: 'PAYMENT_DEFAULT_PROVIDER must reference an enabled provider.',
        });
      }
    }

    if (values.RAZORPAY_ENABLED) {
      for (const [field, value] of [
        ['RAZORPAY_KEY_ID', values.RAZORPAY_KEY_ID],
        ['RAZORPAY_KEY_SECRET', values.RAZORPAY_KEY_SECRET],
        ['RAZORPAY_WEBHOOK_SECRET', values.RAZORPAY_WEBHOOK_SECRET],
      ]) {
        if (!value) {
          context.addIssue({
            code: 'custom',
            path: [field],
            message: `${field} is required when RAZORPAY_ENABLED=true.`,
          });
        }
      }
    }

    if (
      values.RAZORPAY_ENABLED &&
      (values.RAZORPAY_KEY_SECRET.length < 16 ||
        values.RAZORPAY_WEBHOOK_SECRET.length < 16)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['RAZORPAY_KEY_SECRET'],
        message: 'Razorpay secret values must contain at least 16 characters.',
      });
    }

    if (values.STRIPE_ENABLED) {
      for (const [field, value] of [
        ['STRIPE_PUBLIC_KEY', values.STRIPE_PUBLIC_KEY],
        ['STRIPE_SECRET_KEY', values.STRIPE_SECRET_KEY],
        ['STRIPE_WEBHOOK_SECRET', values.STRIPE_WEBHOOK_SECRET],
      ]) {
        if (!value) {
          context.addIssue({
            code: 'custom',
            path: [field],
            message: `${field} is required when STRIPE_ENABLED=true.`,
          });
        }
      }
    }

    if (
      values.STRIPE_ENABLED &&
      (values.STRIPE_SECRET_KEY.length < 16 ||
        values.STRIPE_WEBHOOK_SECRET.length < 16)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['STRIPE_SECRET_KEY'],
        message: 'Stripe secret values must contain at least 16 characters.',
      });
    }

    if (values.COOKIE_SAME_SITE === 'none' && !values.COOKIE_SECURE) {
      context.addIssue({
        code: 'custom',
        path: ['COOKIE_SECURE'],
        message: 'COOKIE_SECURE must be true when COOKIE_SAME_SITE=none.',
      });
    }

    if (values.DOCUMENT_STORAGE_PROVIDER === 'cloudinary') {
      for (const [field, value] of [
        ['CLOUDINARY_CLOUD_NAME', values.CLOUDINARY_CLOUD_NAME],
        ['CLOUDINARY_API_KEY', values.CLOUDINARY_API_KEY],
        ['CLOUDINARY_API_SECRET', values.CLOUDINARY_API_SECRET],
      ]) {
        if (!value) {
          context.addIssue({
            code: 'custom',
            path: [field],
            message: `${field} is required when DOCUMENT_STORAGE_PROVIDER=cloudinary.`,
          });
        }
      }
    }

    if (values.MAIL_DELIVERY_MODE === 'smtp') {
      for (const [field, value] of [
        ['SMTP_HOST', values.SMTP_HOST],
        ['SMTP_USER', values.SMTP_USER],
        ['SMTP_PASSWORD', values.SMTP_PASSWORD],
        ['MAIL_FROM_ADDRESS', values.MAIL_FROM_ADDRESS],
      ]) {
        if (!value) {
          context.addIssue({
            code: 'custom',
            path: [field],
            message: `${field} is required when MAIL_DELIVERY_MODE=smtp.`,
          });
        }
      }
      if (values.MAIL_FROM_ADDRESS && !z.string().email().safeParse(values.MAIL_FROM_ADDRESS).success) {
        context.addIssue({
          code: 'custom',
          path: ['MAIL_FROM_ADDRESS'],
          message: 'MAIL_FROM_ADDRESS must be a valid email address.',
        });
      }
    }

    if (values.NODE_ENV === 'production') {
      if (!values.DATABASE_REQUIRED || !values.AUTH_ENABLED) {
        context.addIssue({
          code: 'custom',
          path: ['AUTH_ENABLED'],
          message: 'Database and authentication must be enabled in production.',
        });
      }
      if (values.MAIL_DELIVERY_MODE !== 'smtp') {
        context.addIssue({
          code: 'custom',
          path: ['MAIL_DELIVERY_MODE'],
          message: 'MAIL_DELIVERY_MODE must be smtp in production.',
        });
      }
      if (!values.COOKIE_SECURE) {
        context.addIssue({
          code: 'custom',
          path: ['COOKIE_SECURE'],
          message: 'COOKIE_SECURE must be true in production.',
        });
      }
    }
  });

const parsedEnvironment = environmentSchema.safeParse(process.env);

if (!parsedEnvironment.success) {
  const message = parsedEnvironment.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  throw new Error(`Invalid server environment configuration:\n${message}`);
}

const values = parsedEnvironment.data;
const accessMaxAgeMs = durationToMilliseconds(
  values.JWT_ACCESS_EXPIRES_IN,
  'JWT_ACCESS_EXPIRES_IN',
);
const refreshMaxAgeMs = durationToMilliseconds(
  values.JWT_REFRESH_EXPIRES_IN,
  'JWT_REFRESH_EXPIRES_IN',
);

export const environment = Object.freeze({
  nodeEnv: values.NODE_ENV,
  isProduction: values.NODE_ENV === 'production',
  isTest: values.NODE_ENV === 'test',
  port: values.PORT,
  clientUrls: values.CLIENT_URL.split(',').map((url) => url.trim()).filter(Boolean),
  serverUrl: values.SERVER_URL,
  databaseRequired: values.DATABASE_REQUIRED,
  mongodbUri: values.MONGODB_URI,
  databaseName: values.DATABASE_NAME,
  authEnabled: values.AUTH_ENABLED,
  applicationPaymentRequired: values.APPLICATION_PAYMENT_REQUIRED,
  payments: {
    enabled: values.PAYMENTS_ENABLED,
    defaultCurrency: values.DEFAULT_CURRENCY.toUpperCase(),
    defaultProvider: values.PAYMENT_DEFAULT_PROVIDER,
    razorpay: {
      enabled: values.RAZORPAY_ENABLED,
      keyId: values.RAZORPAY_KEY_ID,
      keySecret: values.RAZORPAY_KEY_SECRET,
      webhookSecret: values.RAZORPAY_WEBHOOK_SECRET,
    },
    stripe: {
      enabled: values.STRIPE_ENABLED,
      publicKey: values.STRIPE_PUBLIC_KEY,
      secretKey: values.STRIPE_SECRET_KEY,
      webhookSecret: values.STRIPE_WEBHOOK_SECRET,
    },
    offline: {
      enabled: values.OFFLINE_PAYMENT_ENABLED,
      instructions: values.OFFLINE_PAYMENT_INSTRUCTIONS,
      accountName: values.OFFLINE_PAYMENT_ACCOUNT_NAME,
      accountReference: values.OFFLINE_PAYMENT_ACCOUNT_REFERENCE,
    },
  },
  documentStorage: {
    provider: values.DOCUMENT_STORAGE_PROVIDER,
    localDirectory: path.resolve(serverRoot, values.DOCUMENT_LOCAL_DIRECTORY),
    maxFileSizeMb: values.DOCUMENT_MAX_FILE_SIZE_MB,
    maxFileSizeBytes: values.DOCUMENT_MAX_FILE_SIZE_MB * 1024 * 1024,
    signedUrlMinutes: values.DOCUMENT_SIGNED_URL_MINUTES,
    cloudName: values.CLOUDINARY_CLOUD_NAME,
    apiKey: values.CLOUDINARY_API_KEY,
    apiSecret: values.CLOUDINARY_API_SECRET,
    cloudinaryConfigured: Boolean(
      values.CLOUDINARY_CLOUD_NAME &&
      values.CLOUDINARY_API_KEY &&
      values.CLOUDINARY_API_SECRET
    ),
  },
  auth: {
    bcryptRounds: values.BCRYPT_ROUNDS,
    maxLoginAttempts: values.MAX_LOGIN_ATTEMPTS,
    lockDurationMs: values.LOGIN_LOCK_MINUTES * 60_000,
    emailVerificationTtlMs: values.EMAIL_VERIFICATION_HOURS * 3_600_000,
    passwordResetTtlMs: values.PASSWORD_RESET_MINUTES * 60_000,
    twoFactorTtlMs: values.TWO_FACTOR_CODE_MINUTES * 60_000,
  },
  jwt: {
    accessSecret: values.JWT_ACCESS_SECRET,
    refreshSecret: values.JWT_REFRESH_SECRET,
    accessExpiresIn: values.JWT_ACCESS_EXPIRES_IN,
    refreshExpiresIn: values.JWT_REFRESH_EXPIRES_IN,
    accessMaxAgeMs,
    refreshMaxAgeMs,
    issuer: values.JWT_ISSUER,
    audience: values.JWT_AUDIENCE,
  },
  cookie: {
    accessName: values.ACCESS_COOKIE_NAME,
    refreshName: values.REFRESH_COOKIE_NAME,
    domain: values.COOKIE_DOMAIN || undefined,
    secure: values.COOKIE_SECURE,
    sameSite: values.COOKIE_SAME_SITE,
  },
  mail: {
    mode: values.MAIL_DELIVERY_MODE,
    smtpConfigured: values.MAIL_DELIVERY_MODE === 'smtp',
    host: values.SMTP_HOST,
    port: values.SMTP_PORT,
    secure: values.SMTP_SECURE,
    user: values.SMTP_USER,
    password: values.SMTP_PASSWORD,
    fromName: values.MAIL_FROM_NAME,
    fromAddress: values.MAIL_FROM_ADDRESS,
  },
  logLevel: values.LOG_LEVEL,
  trustProxy: values.TRUST_PROXY,
});
