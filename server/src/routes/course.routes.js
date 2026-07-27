import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { PERMISSIONS } from '../constants/permissions.js';
import {
  addReviewNote,
  adminCourse,
  adminPolicy,
  adminQueue,
  adminReviewers,
  approve,
  assignReviewer,
  certificatePdf,
  changeStatus,
  courseDocuments,
  createCourse,
  documentContent,
  myCourse,
  myCourses,
  publicVerification,
  reject,
  removeDocument,
  requestInformation,
  reviewDocument,
  saveAdminPolicy,
  saveChecklist,
  saveCourse,
  submitCourse,
  uploadDocument,
} from '../controllers/course.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorizePermissions } from '../middlewares/authorize.js';
import { requireAuthenticationService } from '../middlewares/requireDatabase.js';
import { documentUpload } from '../middlewares/upload.js';
import { validate } from '../middlewares/validate.js';
import { validateUploadedFileSignature } from '../middlewares/validateFileSignature.js';
import {
  addCourseReviewNoteSchema,
  approveCourseSchema,
  assignCourseReviewerSchema,
  courseAdminActionSchema,
  courseCertificateIdSchema,
  courseDocumentIdSchema,
  courseIdSchema,
  coursePolicySchema,
  courseVerificationSchema,
  createCourseSchema,
  listAdminCoursesSchema,
  listCourseDocumentsSchema,
  listSelfCoursesSchema,
  rejectCourseSchema,
  requestCourseInformationSchema,
  reviewCourseDocumentSchema,
  submitCourseSchema,
  updateCourseChecklistSchema,
  updateCourseSchema,
  uploadCourseDocumentSchema,
} from '../schemas/course.schema.js';

const router = Router();

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 40,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many course-document uploads. Please try again later.',
    errors: [],
  },
});

const publicVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 180,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many verification requests. Please try again later.',
    errors: [],
  },
});

router.get(
  '/verification/:identifier',
  publicVerificationLimiter,
  validate(courseVerificationSchema),
  publicVerification,
);

router.use(requireAuthenticationService, authenticate);

router.get(
  '/certificates/:certificateId/pdf',
  authorizePermissions(PERMISSIONS.COURSE_CERTIFICATE_READ_SELF),
  validate(courseCertificateIdSchema),
  certificatePdf,
);

router.get(
  '/documents/:documentId/content',
  validate(courseDocumentIdSchema),
  documentContent,
);

router.delete(
  '/documents/:documentId',
  authorizePermissions(PERMISSIONS.COURSE_UPDATE_SELF),
  validate(courseDocumentIdSchema),
  removeDocument,
);

router.get(
  '/self',
  authorizePermissions(PERMISSIONS.COURSE_READ_SELF),
  validate(listSelfCoursesSchema),
  myCourses,
);

router.post(
  '/self',
  authorizePermissions(PERMISSIONS.COURSE_CREATE_SELF),
  validate(createCourseSchema),
  createCourse,
);

router.get(
  '/self/:courseId',
  authorizePermissions(PERMISSIONS.COURSE_READ_SELF),
  validate(courseIdSchema),
  myCourse,
);

router.patch(
  '/self/:courseId',
  authorizePermissions(PERMISSIONS.COURSE_UPDATE_SELF),
  validate(updateCourseSchema),
  saveCourse,
);

router.post(
  '/self/:courseId/submit',
  authorizePermissions(PERMISSIONS.COURSE_UPDATE_SELF),
  validate(submitCourseSchema),
  submitCourse,
);

router.get(
  '/self/:courseId/documents',
  authorizePermissions(PERMISSIONS.COURSE_READ_SELF),
  validate(listCourseDocumentsSchema),
  courseDocuments,
);

router.post(
  '/self/:courseId/documents',
  authorizePermissions(PERMISSIONS.COURSE_UPDATE_SELF),
  uploadLimiter,
  documentUpload.single('file'),
  validateUploadedFileSignature,
  validate(uploadCourseDocumentSchema),
  uploadDocument,
);

router.get(
  '/admin/policy',
  authorizePermissions(PERMISSIONS.COURSE_MANAGE_POLICY),
  adminPolicy,
);

router.patch(
  '/admin/policy',
  authorizePermissions(PERMISSIONS.COURSE_MANAGE_POLICY),
  validate(coursePolicySchema),
  saveAdminPolicy,
);

router.get(
  '/admin/reviewers',
  authorizePermissions(PERMISSIONS.COURSE_ASSIGN),
  adminReviewers,
);

router.get(
  '/admin/queue',
  authorizePermissions(PERMISSIONS.COURSE_REVIEW),
  validate(listAdminCoursesSchema),
  adminQueue,
);

router.get(
  '/admin/:courseId',
  authorizePermissions(PERMISSIONS.COURSE_REVIEW),
  validate(courseIdSchema),
  adminCourse,
);

router.patch(
  '/admin/:courseId/assignment',
  authorizePermissions(PERMISSIONS.COURSE_ASSIGN),
  validate(assignCourseReviewerSchema),
  assignReviewer,
);

router.patch(
  '/admin/:courseId/checklist',
  authorizePermissions(PERMISSIONS.COURSE_REVIEW),
  validate(updateCourseChecklistSchema),
  saveChecklist,
);

router.post(
  '/admin/:courseId/notes',
  authorizePermissions(PERMISSIONS.COURSE_REVIEW),
  validate(addCourseReviewNoteSchema),
  addReviewNote,
);

router.post(
  '/admin/:courseId/request-information',
  authorizePermissions(PERMISSIONS.COURSE_REVIEW),
  validate(requestCourseInformationSchema),
  requestInformation,
);

router.post(
  '/admin/:courseId/approve',
  authorizePermissions(PERMISSIONS.COURSE_DECIDE),
  validate(approveCourseSchema),
  approve,
);

router.post(
  '/admin/:courseId/reject',
  authorizePermissions(PERMISSIONS.COURSE_DECIDE),
  validate(rejectCourseSchema),
  reject,
);

router.post(
  '/admin/:courseId/status',
  authorizePermissions(PERMISSIONS.COURSE_DECIDE),
  validate(courseAdminActionSchema),
  changeStatus,
);

router.patch(
  '/admin/documents/:documentId/review',
  authorizePermissions(PERMISSIONS.COURSE_REVIEW),
  validate(reviewCourseDocumentSchema),
  reviewDocument,
);

export default router;
