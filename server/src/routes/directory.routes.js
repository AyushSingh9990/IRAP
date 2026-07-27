import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  directoryProfile,
  listDirectory,
  saveSelfDirectoryProfile,
  selfDirectoryProfiles,
} from '../controllers/directory.controller.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorizePermissions } from '../middlewares/authorize.js';
import { requireAuthenticationService } from '../middlewares/requireDatabase.js';
import { validate } from '../middlewares/validate.js';
import {
  directoryListSchema,
  directoryProfileSchema,
  selfDirectoryProfilesSchema,
  updateDirectoryProfileSchema,
} from '../schemas/directory.schema.js';

const router = Router();

const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 240,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many directory requests. Please try again later.',
    errors: [],
  },
});

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many profile updates. Please try again later.',
    errors: [],
  },
});

router.get(
  '/profile/self',
  requireAuthenticationService,
  authenticate,
  authorizePermissions(PERMISSIONS.MEMBERSHIP_READ_SELF),
  validate(selfDirectoryProfilesSchema),
  selfDirectoryProfiles,
);

router.put(
  '/profile/self/:membershipId',
  writeLimiter,
  requireAuthenticationService,
  authenticate,
  authorizePermissions(PERMISSIONS.MEMBERSHIP_READ_SELF),
  validate(updateDirectoryProfileSchema),
  saveSelfDirectoryProfile,
);

router.get(
  '/:directoryType',
  publicLimiter,
  validate(directoryListSchema),
  listDirectory,
);

router.get(
  '/:directoryType/:slug',
  publicLimiter,
  validate(directoryProfileSchema),
  directoryProfile,
);

export default router;
