import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  getDocumentMetadata,
  listMyDocuments,
  listReviewQueue,
  removeMyDocument,
  replaceMyDocument,
  streamDocument,
  submitDocumentReview,
  uploadMyDocument,
} from '../controllers/document.controller.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorizePermissions } from '../middlewares/authorize.js';
import { requireAuthenticationService } from '../middlewares/requireDatabase.js';
import { documentUpload } from '../middlewares/upload.js';
import { validate } from '../middlewares/validate.js';
import { validateUploadedFileSignature } from '../middlewares/validateFileSignature.js';
import {
  documentContentSchema,
  documentIdSchema,
  listDocumentsSchema,
  replaceDocumentSchema,
  reviewDocumentSchema,
  reviewQueueSchema,
  uploadDocumentSchema,
} from '../schemas/document.schema.js';

const router = Router();

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many document uploads. Please try again later.',
    errors: [],
  },
});

router.use(requireAuthenticationService, authenticate);

router.get(
  '/review-queue',
  authorizePermissions(PERMISSIONS.DOCUMENT_REVIEW),
  validate(reviewQueueSchema),
  listReviewQueue,
);
router.patch(
  '/:documentId/review',
  authorizePermissions(PERMISSIONS.DOCUMENT_REVIEW),
  validate(reviewDocumentSchema),
  submitDocumentReview,
);

router.get(
  '/',
  authorizePermissions(PERMISSIONS.DOCUMENT_READ_SELF),
  validate(listDocumentsSchema),
  listMyDocuments,
);
router.post(
  '/',
  authorizePermissions(PERMISSIONS.DOCUMENT_CREATE_SELF),
  uploadLimiter,
  documentUpload.single('file'),
  validateUploadedFileSignature,
  validate(uploadDocumentSchema),
  uploadMyDocument,
);
router.get('/:documentId', validate(documentIdSchema), getDocumentMetadata);
router.get(
  '/:documentId/content',
  validate(documentContentSchema),
  streamDocument,
);
router.post(
  '/:documentId/replace',
  authorizePermissions(PERMISSIONS.DOCUMENT_UPDATE_SELF),
  uploadLimiter,
  documentUpload.single('file'),
  validateUploadedFileSignature,
  validate(replaceDocumentSchema),
  replaceMyDocument,
);
router.delete(
  '/:documentId',
  authorizePermissions(PERMISSIONS.DOCUMENT_UPDATE_SELF),
  validate(documentIdSchema),
  removeMyDocument,
);

export default router;
