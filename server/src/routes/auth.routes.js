import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  completePasswordReset,
  forgotPassword,
  login,
  logout,
  logoutAll,
  me,
  refresh,
  requestEmailChange,
  register,
  resendEmailVerification,
  revokeSession,
  sessions,
  updatePassword,
  verifyEmail,
  verifyEmailChange,
  verifyTwoFactor,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { requireAuthenticationService } from '../middlewares/requireDatabase.js';
import { validate } from '../middlewares/validate.js';
import {
  changePasswordSchema,
  emailOnlySchema,
  loginSchema,
  registerSchema,
  requestEmailChangeSchema,
  resetPasswordSchema,
  sessionIdSchema,
  tokenSchema,
  twoFactorSchema,
} from '../schemas/auth.schema.js';

const router = Router();

const strictAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again later.',
    errors: [],
  },
});

router.post('/logout', logout);

router.use(requireAuthenticationService);

router.post('/register', strictAuthLimiter, validate(registerSchema), register);
router.post('/verify-email', strictAuthLimiter, validate(tokenSchema), verifyEmail);
router.post(
  '/verify-email-change',
  strictAuthLimiter,
  validate(tokenSchema),
  verifyEmailChange,
);
router.post(
  '/resend-verification',
  strictAuthLimiter,
  validate(emailOnlySchema),
  resendEmailVerification,
);
router.post('/login', strictAuthLimiter, validate(loginSchema), login);
router.post(
  '/verify-two-factor',
  strictAuthLimiter,
  validate(twoFactorSchema),
  verifyTwoFactor,
);
router.post('/refresh', strictAuthLimiter, refresh);
router.post('/forgot-password', strictAuthLimiter, validate(emailOnlySchema), forgotPassword);
router.post(
  '/reset-password',
  strictAuthLimiter,
  validate(resetPasswordSchema),
  completePasswordReset,
);
router.use(authenticate);
router.get('/me', me);
router.get('/sessions', sessions);
router.delete('/sessions/:sessionId', validate(sessionIdSchema), revokeSession);
router.post('/logout-all', logoutAll);
router.post('/change-password', validate(changePasswordSchema), updatePassword);
router.post(
  '/request-email-change',
  validate(requestEmailChangeSchema),
  requestEmailChange,
);

export default router;
