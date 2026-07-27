import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { publicVerification } from '../controllers/membership.controller.js';
import { validate } from '../middlewares/validate.js';
import { publicVerificationSchema } from '../schemas/membership.schema.js';

const router = Router();

const verificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many verification requests. Please try again later.',
    errors: [],
  },
});

router.get(
  '/certificates/:identifier',
  verificationLimiter,
  validate(publicVerificationSchema),
  publicVerification,
);

export default router;
