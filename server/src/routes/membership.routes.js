import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  adminMembership,
  adminMemberships,
  adminPolicy,
  certificatePdf,
  changeMembershipStatus,
  issueApprovedMembership,
  myMembership,
  myMemberships,
  replaceCertificate,
  revokeCertificate,
  runRenewalProcessing,
  saveAdminPolicy,
  startRenewal,
} from '../controllers/membership.controller.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorizePermissions } from '../middlewares/authorize.js';
import { requireAuthenticationService } from '../middlewares/requireDatabase.js';
import { validate } from '../middlewares/validate.js';
import {
  adminMembershipListSchema,
  certificateAdminActionSchema,
  certificateIdSchema,
  createRenewalApplicationSchema,
  issueMembershipSchema,
  membershipAdminActionSchema,
  membershipIdSchema,
  membershipPolicySchema,
  processRenewalsSchema,
} from '../schemas/membership.schema.js';

const router = Router();

const certificateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 80,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, message: 'Too many certificate requests.', errors: [] },
});

router.use(requireAuthenticationService, authenticate);

router.get(
  '/self',
  authorizePermissions(PERMISSIONS.MEMBERSHIP_READ_SELF),
  myMemberships,
);
router.get(
  '/self/:membershipId',
  authorizePermissions(PERMISSIONS.MEMBERSHIP_READ_SELF),
  validate(membershipIdSchema),
  myMembership,
);
router.post(
  '/self/:membershipId/renewals',
  authorizePermissions(PERMISSIONS.MEMBERSHIP_RENEW_SELF),
  validate(createRenewalApplicationSchema),
  startRenewal,
);
router.get(
  '/certificates/:certificateId/pdf',
  certificateLimiter,
  authorizePermissions(PERMISSIONS.CERTIFICATE_READ_SELF),
  validate(certificateIdSchema),
  certificatePdf,
);

router.get(
  '/admin/policy',
  authorizePermissions(PERMISSIONS.MEMBERSHIP_MANAGE),
  adminPolicy,
);
router.patch(
  '/admin/policy',
  authorizePermissions(PERMISSIONS.MEMBERSHIP_MANAGE),
  validate(membershipPolicySchema),
  saveAdminPolicy,
);
router.get(
  '/admin/records',
  authorizePermissions(PERMISSIONS.MEMBERSHIP_MANAGE),
  validate(adminMembershipListSchema),
  adminMemberships,
);
router.get(
  '/admin/records/:membershipId',
  authorizePermissions(PERMISSIONS.MEMBERSHIP_MANAGE),
  validate(membershipIdSchema),
  adminMembership,
);
router.post(
  '/admin/issue',
  authorizePermissions(PERMISSIONS.MEMBERSHIP_MANAGE),
  validate(issueMembershipSchema),
  issueApprovedMembership,
);
router.post(
  '/admin/records/:membershipId/status',
  authorizePermissions(PERMISSIONS.MEMBERSHIP_MANAGE),
  validate(membershipAdminActionSchema),
  changeMembershipStatus,
);
router.post(
  '/admin/certificates/:certificateId/revoke',
  authorizePermissions(PERMISSIONS.CERTIFICATE_MANAGE),
  validate(certificateAdminActionSchema),
  revokeCertificate,
);
router.post(
  '/admin/certificates/:certificateId/replace',
  authorizePermissions(PERMISSIONS.CERTIFICATE_MANAGE),
  validate(certificateAdminActionSchema),
  replaceCertificate,
);
router.post(
  '/admin/process-renewals',
  authorizePermissions(PERMISSIONS.MEMBERSHIP_MANAGE),
  validate(processRenewalsSchema),
  runRenewalProcessing,
);

export default router;
