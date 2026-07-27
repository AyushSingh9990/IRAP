import { Router } from 'express';
import {
  approve,
  assign,
  assignBulk,
  audit,
  checklist,
  dashboard,
  note,
  paymentWaiver,
  queue,
  reject,
  requestInformation,
  reviewers,
  suspend,
  workspace,
} from '../controllers/review.controller.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorizePermissions } from '../middlewares/authorize.js';
import { requireAuthenticationService } from '../middlewares/requireDatabase.js';
import { validate } from '../middlewares/validate.js';
import {
  addReviewNoteSchema,
  applicationReviewIdSchema,
  approveApplicationSchema,
  assignReviewerSchema,
  auditListSchema,
  bulkAssignReviewerSchema,
  paymentWaiverSchema,
  rejectApplicationSchema,
  requestInformationSchema,
  reviewDashboardSchema,
  reviewQueueSchema,
  suspendApplicationSchema,
  updateReviewChecklistSchema,
} from '../schemas/review.schema.js';

const router = Router();

router.use(requireAuthenticationService, authenticate);

router.get(
  '/dashboard',
  authorizePermissions(PERMISSIONS.APPLICATION_REVIEW),
  validate(reviewDashboardSchema),
  dashboard,
);
router.get(
  '/queue',
  authorizePermissions(PERMISSIONS.APPLICATION_REVIEW),
  validate(reviewQueueSchema),
  queue,
);
router.get(
  '/reviewers',
  authorizePermissions(PERMISSIONS.APPLICATION_ASSIGN),
  reviewers,
);
router.post(
  '/assign-bulk',
  authorizePermissions(PERMISSIONS.APPLICATION_ASSIGN),
  validate(bulkAssignReviewerSchema),
  assignBulk,
);
router.get(
  '/audit',
  authorizePermissions(PERMISSIONS.AUDIT_READ),
  validate(auditListSchema),
  audit,
);
router.get(
  '/applications/:applicationId',
  authorizePermissions(PERMISSIONS.APPLICATION_REVIEW),
  validate(applicationReviewIdSchema),
  workspace,
);
router.patch(
  '/applications/:applicationId/assignment',
  authorizePermissions(PERMISSIONS.APPLICATION_ASSIGN),
  validate(assignReviewerSchema),
  assign,
);
router.post(
  '/applications/:applicationId/notes',
  authorizePermissions(PERMISSIONS.APPLICATION_REVIEW),
  validate(addReviewNoteSchema),
  note,
);
router.patch(
  '/applications/:applicationId/checklist',
  authorizePermissions(PERMISSIONS.APPLICATION_REVIEW),
  validate(updateReviewChecklistSchema),
  checklist,
);
router.patch(
  '/applications/:applicationId/payment-waiver',
  authorizePermissions(PERMISSIONS.APPLICATION_ASSIGN),
  validate(paymentWaiverSchema),
  paymentWaiver,
);
router.post(
  '/applications/:applicationId/request-information',
  authorizePermissions(PERMISSIONS.APPLICATION_DECIDE),
  validate(requestInformationSchema),
  requestInformation,
);
router.post(
  '/applications/:applicationId/approve',
  authorizePermissions(PERMISSIONS.APPLICATION_DECIDE),
  validate(approveApplicationSchema),
  approve,
);
router.post(
  '/applications/:applicationId/reject',
  authorizePermissions(PERMISSIONS.APPLICATION_DECIDE),
  validate(rejectApplicationSchema),
  reject,
);
router.post(
  '/applications/:applicationId/suspend',
  authorizePermissions(PERMISSIONS.APPLICATION_DECIDE),
  validate(suspendApplicationSchema),
  suspend,
);

export default router;
