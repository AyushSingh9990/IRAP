import { Router } from 'express';
import { getOverview, updateAccount } from '../controllers/dashboard.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorizePermissions } from '../middlewares/authorize.js';
import { requireAuthenticationService } from '../middlewares/requireDatabase.js';
import { validate } from '../middlewares/validate.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { accountSettingsSchema } from '../schemas/dashboard.schema.js';

const router = Router();

router.use(requireAuthenticationService, authenticate);
router.get('/', authorizePermissions(PERMISSIONS.ACCOUNT_READ_SELF), getOverview);
router.patch(
  '/account',
  authorizePermissions(PERMISSIONS.ACCOUNT_UPDATE_SELF),
  validate(accountSettingsSchema),
  updateAccount,
);

export default router;
