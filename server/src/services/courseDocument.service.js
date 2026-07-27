import {
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
} from '../constants/auditActions.js';
import {
  COURSE_DOCUMENT_CATEGORY_LABELS,
  COURSE_REVIEW_NOTE_VISIBILITIES,
  COURSE_REVIEW_STATUSES,
  COURSE_STATUSES,
  EDITABLE_COURSE_STATUSES,
} from '../constants/courseConstants.js';
import {
  DOCUMENT_REVIEW_ACTIONS,
  DOCUMENT_REVIEW_STATUSES,
} from '../constants/documentStatuses.js';
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_TYPES,
} from '../constants/notificationConstants.js';
import { PERMISSIONS } from '../constants/permissions.js';
import Course from '../models/Course.js';
import CourseDocument from '../models/CourseDocument.js';
import CourseReview from '../models/CourseReview.js';
import { ApiError } from '../utils/ApiError.js';
import { recordSuccessfulAudit } from './auditLog.service.js';
import {
  deleteDocumentAsset,
  openDocumentAsset,
  storeDocumentAsset,
} from './documentStorage.service.js';
import { createNotificationSafely } from './notification.service.js';

function asId(value) {
  return value?.toString?.() || String(value);
}

function reviewerAccess(auth) {
  return (
    auth?.permissions?.includes(PERMISSIONS.COURSE_REVIEW) ||
    auth?.permissions?.includes(PERMISSIONS.COURSE_DECIDE) ||
    auth?.permissions?.includes(PERMISSIONS.SYSTEM_MANAGE)
  );
}

function serializeDocument(document, { reviewer = false } = {}) {
  const value = document.toObject ? document.toObject() : document;

  return {
    id: asId(value._id || value.id),
    courseId: asId(value.course?._id || value.course),
    category: value.category,
    categoryLabel:
      COURSE_DOCUMENT_CATEGORY_LABELS[value.category] || value.category,
    title: value.title,
    originalFilename: value.originalFilename,
    format: value.format,
    mimeType: value.mimeType,
    sizeBytes: value.sizeBytes,
    reviewStatus: value.reviewStatus,
    providerVisibleNote: value.providerVisibleNote || '',
    internalNote: reviewer ? value.internalNote || '' : undefined,
    reviewedAt: value.reviewedAt,
    reviewedBy: reviewer
      ? {
          id: value.reviewedBy?._id
            ? asId(value.reviewedBy._id)
            : null,
          displayName: value.reviewedBy?.displayName || '',
          email: value.reviewedBy?.email || '',
        }
      : undefined,
    replaces: value.replaces ? asId(value.replaces) : null,
    replacedBy: value.replacedBy ? asId(value.replacedBy) : null,
    isCurrent: value.isCurrent,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    reviewHistory: (value.reviewHistory || []).map((entry) => ({
      id: asId(entry._id || entry.id),
      previousStatus: entry.previousStatus,
      newStatus: entry.newStatus,
      providerVisibleNote: entry.providerVisibleNote || '',
      internalNote: reviewer ? entry.internalNote || '' : undefined,
      reason: entry.reason || '',
      changedAt: entry.changedAt,
    })),
  };
}

async function editableOwnedCourse(courseId, ownerId) {
  const course = await Course.findOne({
    _id: courseId,
    owner: ownerId,
  });

  if (!course) {
    throw new ApiError(404, 'Course record not found.');
  }

  if (!EDITABLE_COURSE_STATUSES.includes(course.status)) {
    throw new ApiError(
      409,
      'Course evidence can be changed only while the course is editable.',
    );
  }

  return course;
}

async function loadDocument(documentId) {
  const document = await CourseDocument.findOne({
    _id: documentId,
    deletedAt: null,
  })
    .select(
      '+storageKey +resourceType +deliveryType +checksumSha256 +internalNote',
    )
    .populate('course', 'reference title status owner')
    .populate('reviewedBy', 'displayName email');

  if (!document) {
    throw new ApiError(404, 'Course document not found.');
  }

  return document;
}

export async function listCourseDocuments({
  courseId,
  auth,
  includeHistory = false,
}) {
  const course = await Course.findById(courseId).select('owner');

  if (!course) {
    throw new ApiError(404, 'Course record not found.');
  }

  const ownsCourse = asId(course.owner) === asId(auth.userId);

  if (!ownsCourse && !reviewerAccess(auth)) {
    throw new ApiError(
      403,
      'You do not have permission to access these course documents.',
    );
  }

  const query = {
    course: courseId,
    deletedAt: null,
  };

  if (!includeHistory) query.isCurrent = true;

  const documents = await CourseDocument.find(query)
    .select(reviewerAccess(auth) && !ownsCourse ? '+internalNote' : '')
    .populate('reviewedBy', 'displayName email')
    .sort({ createdAt: -1 });

  return documents.map((document) =>
    serializeDocument(document, {
      reviewer: reviewerAccess(auth) && !ownsCourse,
    }),
  );
}

export async function uploadCourseDocument({
  courseId,
  ownerId,
  file,
  input,
}) {
  const course = await editableOwnedCourse(courseId, ownerId);
  let asset;
  let document;

  try {
    asset = await storeDocumentAsset({
      file,
      ownerId,
      applicationId: course.id,
    });

    const previous = await CourseDocument.findOne({
      course: course._id,
      category: input.category,
      isCurrent: true,
      deletedAt: null,
    }).select('+internalNote');

    document = await CourseDocument.create({
      course: course._id,
      owner: ownerId,
      category: input.category,
      title: input.title,
      ...asset,
      replaces: previous?._id || null,
      reviewHistory: [
        {
          previousStatus: null,
          newStatus: DOCUMENT_REVIEW_STATUSES.PENDING,
          changedBy: ownerId,
          providerVisibleNote:
            'Course evidence uploaded and awaiting review.',
        },
      ],
    });

    if (previous) {
      const previousStatus = previous.reviewStatus;
      previous.isCurrent = false;
      previous.replacedBy = document._id;
      previous.reviewStatus = DOCUMENT_REVIEW_STATUSES.SUPERSEDED;
      previous.reviewHistory.push({
        previousStatus,
        newStatus: DOCUMENT_REVIEW_STATUSES.SUPERSEDED,
        changedBy: ownerId,
        providerVisibleNote:
          'This document version was replaced by the provider.',
      });
      await previous.save();
    }

    return serializeDocument(document);
  } catch (error) {
    if (document) {
      await CourseDocument.deleteOne({ _id: document._id }).catch(() => {});
    }

    if (asset) {
      await deleteDocumentAsset(asset).catch(() => {});
    }

    throw error;
  }
}

export async function removeCourseDocument({
  documentId,
  ownerId,
}) {
  const document = await loadDocument(documentId);

  if (asId(document.course.owner) !== asId(ownerId)) {
    throw new ApiError(
      403,
      'You do not have permission to remove this course document.',
    );
  }

  if (
    !document.isCurrent ||
    document.reviewStatus !== DOCUMENT_REVIEW_STATUSES.PENDING ||
    document.course.status !== COURSE_STATUSES.DRAFT
  ) {
    throw new ApiError(
      409,
      'Only pending evidence attached to a draft course can be removed.',
    );
  }

  document.isCurrent = false;
  document.deletedAt = new Date();
  await document.save();
  await deleteDocumentAsset(document).catch(() => {});
}

export async function getCourseDocumentContent({
  documentId,
  auth,
}) {
  const document = await loadDocument(documentId);
  const ownsCourse =
    asId(document.course.owner) === asId(auth.userId);

  if (!ownsCourse && !reviewerAccess(auth)) {
    throw new ApiError(
      403,
      'You do not have permission to access this course document.',
    );
  }

  const asset = await openDocumentAsset(document);
  return { document, asset };
}

function statusForAction(action) {
  if (action === DOCUMENT_REVIEW_ACTIONS.APPROVE) {
    return DOCUMENT_REVIEW_STATUSES.APPROVED;
  }

  if (action === DOCUMENT_REVIEW_ACTIONS.REJECT) {
    return DOCUMENT_REVIEW_STATUSES.REJECTED;
  }

  return DOCUMENT_REVIEW_STATUSES.REPLACEMENT_REQUESTED;
}

export async function reviewCourseDocument({
  documentId,
  actor,
  input,
  context,
}) {
  const reviewerId = actor.userId;
  const document = await CourseDocument.findOne({
    _id: documentId,
    deletedAt: null,
    isCurrent: true,
  })
    .select('+internalNote')
    .populate('course', 'reference title status owner')
    .populate('reviewedBy', 'displayName email');

  if (!document) {
    throw new ApiError(404, 'Course document not found.');
  }

  const previousStatus = document.reviewStatus;
  const newStatus = statusForAction(input.action);

  document.reviewStatus = newStatus;
  document.reviewedBy = reviewerId;
  document.reviewedAt = new Date();
  document.providerVisibleNote = input.providerVisibleNote;
  document.internalNote = input.internalNote;
  document.reviewHistory.push({
    previousStatus,
    newStatus,
    changedBy: reviewerId,
    providerVisibleNote: input.providerVisibleNote,
    internalNote: input.internalNote,
    reason: input.reason,
  });

  await document.save();
  await document.populate('reviewedBy', 'displayName email');

  if (
    [
      DOCUMENT_REVIEW_STATUSES.REJECTED,
      DOCUMENT_REVIEW_STATUSES.REPLACEMENT_REQUESTED,
    ].includes(newStatus)
  ) {
    const course = await Course.findById(document.course._id);
    const review = await CourseReview.findOne({
      course: document.course._id,
    });

    if (
      course &&
      [
        COURSE_STATUSES.SUBMITTED,
        COURSE_STATUSES.RESUBMITTED,
        COURSE_STATUSES.UNDER_REVIEW,
      ].includes(course.status)
    ) {
      const previousCourseStatus = course.status;
      course.status = COURSE_STATUSES.INFORMATION_REQUIRED;
      course.statusHistory.push({
        previousStatus: previousCourseStatus,
        newStatus: COURSE_STATUSES.INFORMATION_REQUIRED,
        changedBy: reviewerId,
        reason: input.reason,
        providerVisibleNote:
          input.providerVisibleNote ||
          `${document.title} requires provider action.`,
        internalNote: input.internalNote,
      });
      await course.save();
    }

    if (review) {
      review.status = COURSE_REVIEW_STATUSES.AWAITING_INFORMATION;
      const requestedField = `document:${document.category}`;

      if (!review.requestedFields.includes(requestedField)) {
        review.requestedFields.push(requestedField);
      }

      if (input.providerVisibleNote) {
        review.notes.push({
          visibility: COURSE_REVIEW_NOTE_VISIBILITIES.PROVIDER,
          body: input.providerVisibleNote,
          createdBy: reviewerId,
        });
      }

      if (input.internalNote) {
        review.notes.push({
          visibility: COURSE_REVIEW_NOTE_VISIBILITIES.INTERNAL,
          body: input.internalNote,
          createdBy: reviewerId,
        });
      }

      review.lastActivityAt = new Date();
      await review.save();
    }
  }

  const messages = {
    approved: {
      title: 'Course evidence approved',
      message: `${document.title} was approved.`,
    },
    rejected: {
      title: 'Course evidence rejected',
      message:
        input.providerVisibleNote ||
        `${document.title} was rejected.`,
    },
    replacement_requested: {
      title: 'Course evidence replacement requested',
      message:
        input.providerVisibleNote ||
        `${document.title} requires replacement.`,
    },
  };

  const copy = messages[newStatus] || {
    title: 'Course evidence updated',
    message: `${document.title} has a new review status.`,
  };

  await createNotificationSafely({
    recipient: document.course.owner,
    type: NOTIFICATION_TYPES.COURSE_DOCUMENT_UPDATED,
    category: NOTIFICATION_CATEGORIES.COURSE,
    title: copy.title,
    message: copy.message,
    actionUrl: `/dashboard/courses/${document.course._id}`,
    reference: document.course.reference,
    dedupeKey: `course-document:${document.id}:${document.reviewHistory.length}`,
    createdBy: reviewerId,
  });

  await recordSuccessfulAudit(
    {
      action: AUDIT_ACTIONS.COURSE_DOCUMENT_REVIEWED,
      actor,
      entityType: AUDIT_ENTITY_TYPES.COURSE_DOCUMENT,
      entityId: document.id,
      subjectUser: document.course.owner,
      reason: input.reason,
      previousValues: { reviewStatus: previousStatus },
      context,
    },
    { reviewStatus: newStatus },
  );

  return serializeDocument(document, { reviewer: true });
}

export async function countApprovedCurrentDocuments(courseId) {
  return CourseDocument.countDocuments({
    course: courseId,
    isCurrent: true,
    deletedAt: null,
    reviewStatus: DOCUMENT_REVIEW_STATUSES.APPROVED,
  });
}

export async function currentCourseDocuments(courseId) {
  return CourseDocument.find({
    course: courseId,
    isCurrent: true,
    deletedAt: null,
  }).sort({ createdAt: 1 });
}
