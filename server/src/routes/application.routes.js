import { Router } from 'express';
import {
  createApplication,
  getApplication,
  listApplications,
  saveStep,
  submit,
  withdraw,
} from '../controllers/application.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { requireAuthenticationService } from '../middlewares/requireDatabase.js';
import { validate } from '../middlewares/validate.js';
import {
  applicationIdSchema,
  createApplicationSchema,
  saveApplicationStepSchema,
  withdrawApplicationSchema,
} from '../schemas/application.schema.js';

const router = Router();

router.use(requireAuthenticationService, authenticate);
router.get('/', listApplications);
router.post('/', validate(createApplicationSchema), createApplication);
router.get('/:applicationId', validate(applicationIdSchema), getApplication);
router.patch(
  '/:applicationId/steps/:stepKey',
  validate(saveApplicationStepSchema),
  saveStep,
);
router.post('/:applicationId/submit', validate(applicationIdSchema), submit);
router.post(
  '/:applicationId/withdraw',
  validate(withdrawApplicationSchema),
  withdraw,
);

export default router;
