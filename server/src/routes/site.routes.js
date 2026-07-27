import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  publicConfiguration,
  publicContentPage,
  submitComplaint,
  submitContact,
} from '../controllers/site.controller.js';
import { requireDatabase } from '../middlewares/requireDatabase.js';
import { validate } from '../middlewares/validate.js';
import {
  publicComplaintSchema,
  publicContactSchema,
  publicPageSchema,
} from '../schemas/site.schema.js';

const router = Router();

const submissionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 8,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many submissions were received from this connection. Please try again later.',
    errors: [],
  },
});

router.use(requireDatabase);
router.get('/configuration', publicConfiguration);
router.get('/content/:slug', validate(publicPageSchema), publicContentPage);
router.post('/contact', submissionLimiter, validate(publicContactSchema), submitContact);
router.post('/complaints', submissionLimiter, validate(publicComplaintSchema), submitComplaint);

export default router;
