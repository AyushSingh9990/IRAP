import { Router } from 'express';
import {
  getNotifications,
  getPreferences,
  getSummary,
  readAllNotifications,
  readNotification,
  updatePreferences,
} from '../controllers/notification.controller.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorizePermissions } from '../middlewares/authorize.js';
import { requireAuthenticationService } from '../middlewares/requireDatabase.js';
import { validate } from '../middlewares/validate.js';
import {
  notificationIdSchema,
  notificationListSchema,
  notificationPreferenceSchema,
} from '../schemas/dashboard.schema.js';

const router = Router();

router.use(requireAuthenticationService, authenticate);
router.get(
  '/',
  authorizePermissions(PERMISSIONS.NOTIFICATION_READ_SELF),
  validate(notificationListSchema),
  getNotifications,
);
router.get(
  '/summary',
  authorizePermissions(PERMISSIONS.NOTIFICATION_READ_SELF),
  getSummary,
);
router.patch(
  '/read-all',
  authorizePermissions(PERMISSIONS.NOTIFICATION_UPDATE_SELF),
  readAllNotifications,
);
router.patch(
  '/:notificationId/read',
  authorizePermissions(PERMISSIONS.NOTIFICATION_UPDATE_SELF),
  validate(notificationIdSchema),
  readNotification,
);
router.get(
  '/preferences/current',
  authorizePermissions(PERMISSIONS.NOTIFICATION_READ_SELF),
  getPreferences,
);
router.patch(
  '/preferences/current',
  authorizePermissions(PERMISSIONS.NOTIFICATION_UPDATE_SELF),
  validate(notificationPreferenceSchema),
  updatePreferences,
);

export default router;
