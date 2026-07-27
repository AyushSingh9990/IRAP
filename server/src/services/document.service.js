import { DOCUMENT_CATEGORY_LABELS } from '../constants/documentCategories.js';
import {
  DOCUMENT_REVIEW_ACTIONS,
  DOCUMENT_REVIEW_STATUSES,
} from '../constants/documentStatuses.js';
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_TYPES,
} from '../constants/notificationConstants.js';
import {
  APPLICATION_STATUSES,
  EDITABLE_APPLICATION_STATUSES,
} from '../constants/applicationStatuses.js';
import { PERMISSIONS } from '../constants/permissions.js';
import Application from '../models/Application.js';
import Document from '../models/Document.js';
import { logger } from '../config/logger.js';
import { ApiError } from '../utils/ApiError.js';
import {
  deleteDocumentAsset,
  openDocumentAsset,
  storeDocumentAsset,
} from './documentStorage.service.js';
import { createNotificationSafely } from './notification.service.js';

const DOCUMENT_REPLACEMENT_APPLICATION_STATUSES = Object.freeze([
  APPLICATION_STATUSES.DRAFT,
  APPLICATION_STATUSES.SUBMITTED,
  APPLICATION_STATUSES.PAYMENT_PENDING,
  APPLICATION_STATUSES.PAYMENT_CONFIRMED,
  APPLICATION_STATUSES.UNDER_REVIEW,
  APPLICATION_STATUSES.ADDITIONAL_INFORMATION_REQUIRED,
  APPLICATION_STATUSES.RESUBMITTED,
  APPLICATION_STATUSES.RENEWAL_DUE,
  APPLICATION_STATUSES.RENEWAL_SUBMITTED,
]);

function asId(value) {
  return value?.toString?.() || String(value);
}

function canReview(auth) {
  return auth?.permissions?.includes(PERMISSIONS.DOCUMENT_REVIEW) ?? false;
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

function serializeApplication(application) {
  if (!application) return null;
  return {
    id: asId(application._id || application.id),
    reference: application.reference,
    type: application.type,
    status: application.status,
  };
}

function serializeOwner(owner) {
  if (!owner) return null;
  return {
    id: asId(owner._id || owner.id),
    displayName: owner.displayName,
    email: owner.email,
  };
}

function serializeDocument(document, { reviewer = false } = {}) {
  const value = document.toObject ? document.toObject() : document;
  return {
    id: asId(value._id || value.id),
    application: serializeApplication(value.application),
    owner: reviewer ? serializeOwner(value.owner) : undefined,
    applicationType: value.applicationType,
    category: value.category,
    categoryLabel: DOCUMENT_CATEGORY_LABELS[value.category] || value.category,
    title: value.title,
    originalFilename: value.originalFilename,
    format: value.format,
    mimeType: value.mimeType,
    sizeBytes: value.sizeBytes,
    reviewStatus: value.reviewStatus,
    applicantVisibleNote: value.applicantVisibleNote || '',
    internalNote: reviewer ? value.internalNote || '' : undefined,
    expiryDate: value.expiryDate,
    reviewedAt: value.reviewedAt,
    reviewedBy: reviewer ? serializeOwner(value.reviewedBy) : undefined,
    replaces: value.replaces ? asId(value.replaces) : null,
    replacedBy: value.replacedBy ? asId(value.replacedBy) : null,
    isCurrent: value.isCurrent,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    reviewHistory: (value.reviewHistory || []).map((entry) => ({
      id: asId(entry._id || entry.id),
      previousStatus: entry.previousStatus,
      newStatus: entry.newStatus,
      applicantVisibleNote: entry.applicantVisibleNote || '',
      internalNote: reviewer ? entry.internalNote || '' : undefined,
      reason: entry.reason || '',
      changedAt: entry.changedAt,
    })),
    canDelete:
      value.isCurrent &&
      value.reviewStatus === DOCUMENT_REVIEW_STATUSES.PENDING &&
      value.application?.status === APPLICATION_STATUSES.DRAFT,
    canReplace:
      value.isCurrent &&
      (EDITABLE_APPLICATION_STATUSES.includes(value.application?.status) ||
        (value.reviewStatus ===
          DOCUMENT_REVIEW_STATUSES.REPLACEMENT_REQUESTED &&
          DOCUMENT_REPLACEMENT_APPLICATION_STATUSES.includes(
            value.application?.status,
          ))),
  };
}

async function getEditableApplication(applicationId, ownerId) {
  const application = await Application.findOne({
    _id: applicationId,
    owner: ownerId,
    isCurrent: true,
  });

  if (!application) {
    throw new ApiError(404, 'The application was not found.');
  }

  if (!EDITABLE_APPLICATION_STATUSES.includes(application.status)) {
    throw new ApiError(
      409,
      'Documents can only be changed while the application is editable.',
    );
  }

  return application;
}

async function loadDocumentForAccess(documentId) {
  const document = await Document.findOne({
    _id: documentId,
    deletedAt: null,
  })
    .select('+storageKey +resourceType +deliveryType +checksumSha256 +internalNote')
    .populate('application', 'reference type status owner')
    .populate('owner', 'displayName email')
    .populate('reviewedBy', 'displayName email');

  if (!document) {
    throw new ApiError(404, 'The document was not found.');
  }

  return document;
}

export async function listDocumentsForOwner({ ownerId, applicationId, includeHistory }) {
  const query = {
    owner: ownerId,
    deletedAt: null,
  };
  if (applicationId) query.application = applicationId;
  if (!includeHistory) query.isCurrent = true;

  const documents = await Document.find(query)
    .populate('application', 'reference type status')
    .sort({ createdAt: -1 });

  return documents.map((document) => serializeDocument(document));
}

export async function uploadDocument({ ownerId, file, input }) {
  const application = await getEditableApplication(input.applicationId, ownerId);
  let asset;
  let document;

  try {
    asset = await storeDocumentAsset({
      file,
      ownerId,
      applicationId: application.id,
    });

    document = await Document.create({
      owner: ownerId,
      application: application._id,
      applicationType: application.type,
      category: input.category,
      title: input.title,
      ...asset,
      uploadedBy: ownerId,
      expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
      reviewHistory: [
        {
          previousStatus: null,
          newStatus: DOCUMENT_REVIEW_STATUSES.PENDING,
          changedBy: ownerId,
          applicantVisibleNote: 'Document uploaded and awaiting review.',
        },
      ],
    });

    await document.populate('application', 'reference type status');
    return serializeDocument(document);
  } catch (error) {
    if (document) {
      await Document.deleteOne({ _id: document._id }).catch(() => {});
    }
    if (asset) {
      await deleteDocumentAsset(asset).catch(() => {});
    }
    throw error;
  }
}

export async function replaceDocument({ documentId, ownerId, file, input }) {
  const existing = await loadDocumentForAccess(documentId);

  if (asId(existing.owner?._id || existing.owner) !== asId(ownerId)) {
    throw new ApiError(403, 'You do not have permission to replace this document.');
  }
  if (!existing.isCurrent) {
    throw new ApiError(409, 'Only the current document version can be replaced.');
  }

  const application = await Application.findOne({
    _id: existing.application._id,
    owner: ownerId,
    isCurrent: true,
  });

  if (!application) {
    throw new ApiError(404, 'The application was not found.');
  }

  const editableApplication = EDITABLE_APPLICATION_STATUSES.includes(
    application.status,
  );
  const requestedReplacement =
    existing.reviewStatus === DOCUMENT_REVIEW_STATUSES.REPLACEMENT_REQUESTED &&
    DOCUMENT_REPLACEMENT_APPLICATION_STATUSES.includes(application.status);

  if (!editableApplication && !requestedReplacement) {
    throw new ApiError(
      409,
      'This document cannot be replaced in the current application state.',
    );
  }

  let asset;
  let replacement;

  try {
    asset = await storeDocumentAsset({
      file,
      ownerId,
      applicationId: application.id,
    });

    replacement = await Document.create({
      owner: ownerId,
      application: application._id,
      applicationType: application.type,
      category: existing.category,
      title: input.title || existing.title,
      ...asset,
      uploadedBy: ownerId,
      expiryDate:
        input.expiryDate === ''
          ? null
          : input.expiryDate
            ? new Date(input.expiryDate)
            : existing.expiryDate,
      replaces: existing._id,
      reviewHistory: [
        {
          previousStatus: null,
          newStatus: DOCUMENT_REVIEW_STATUSES.PENDING,
          changedBy: ownerId,
          applicantVisibleNote: 'Replacement uploaded and awaiting review.',
        },
      ],
    });

    await replacement.populate('application', 'reference type status');

    const previousStatus = existing.reviewStatus;
    existing.isCurrent = false;
    existing.replacedBy = replacement._id;
    existing.reviewStatus = DOCUMENT_REVIEW_STATUSES.SUPERSEDED;
    existing.reviewHistory.push({
      previousStatus,
      newStatus: DOCUMENT_REVIEW_STATUSES.SUPERSEDED,
      changedBy: ownerId,
      applicantVisibleNote: 'This version was replaced by the applicant.',
    });
    await existing.save();

    return serializeDocument(replacement);
  } catch (error) {
    if (replacement) {
      await Document.deleteOne({ _id: replacement._id }).catch(() => {});
    }
    if (asset) {
      await deleteDocumentAsset(asset).catch(() => {});
    }
    throw error;
  }
}

export async function removeDraftDocument({ documentId, ownerId }) {
  const document = await loadDocumentForAccess(documentId);

  if (asId(document.owner?._id || document.owner) !== asId(ownerId)) {
    throw new ApiError(403, 'You do not have permission to remove this document.');
  }

  if (
    !document.isCurrent ||
    document.reviewStatus !== DOCUMENT_REVIEW_STATUSES.PENDING ||
    document.application.status !== APPLICATION_STATUSES.DRAFT
  ) {
    throw new ApiError(
      409,
      'Only pending documents attached to a draft application can be removed.',
    );
  }

  document.deletedAt = new Date();
  document.isCurrent = false;
  await document.save();
  await deleteDocumentAsset(document).catch((error) => {
    logger.error(
      { error, documentId: document.id },
      'Private document asset cleanup failed after draft removal',
    );
  });
}

export async function getDocumentForAccess({ documentId, auth }) {
  const document = await loadDocumentForAccess(documentId);
  const ownsDocument = asId(document.owner?._id || document.owner) === asId(auth.userId);

  if (!ownsDocument && !canReview(auth)) {
    throw new ApiError(403, 'You do not have permission to access this document.');
  }

  return {
    document,
    serialized: serializeDocument(document, { reviewer: !ownsDocument && canReview(auth) }),
  };
}

export async function getDocumentContent({ documentId, auth }) {
  const { document } = await getDocumentForAccess({ documentId, auth });
  const asset = await openDocumentAsset(document);
  return { document, asset };
}

export async function listDocumentsForReview({ filters }) {
  const query = { deletedAt: null, isCurrent: true };
  if (filters.status) query.reviewStatus = filters.status;
  if (filters.category) query.category = filters.category;
  if (filters.applicationId) query.application = filters.applicationId;

  const skip = (filters.page - 1) * filters.limit;
  const [documents, total] = await Promise.all([
    Document.find(query)
      .select('+internalNote')
      .populate('owner', 'displayName email')
      .populate('application', 'reference type status')
      .populate('reviewedBy', 'displayName email')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(filters.limit),
    Document.countDocuments(query),
  ]);

  return {
    documents: documents.map((document) =>
      serializeDocument(document, { reviewer: true }),
    ),
    meta: {
      page: filters.page,
      limit: filters.limit,
      total,
      pages: Math.max(1, Math.ceil(total / filters.limit)),
    },
  };
}

export async function reviewDocument({ documentId, reviewerId, input }) {
  const document = await Document.findOne({
    _id: documentId,
    deletedAt: null,
    isCurrent: true,
  })
    .select('+internalNote')
    .populate('owner', 'displayName email')
    .populate('application', 'reference type status')
    .populate('reviewedBy', 'displayName email');

  if (!document) {
    throw new ApiError(404, 'The document was not found.');
  }

  const previousStatus = document.reviewStatus;
  const newStatus = statusForAction(input.action);

  document.reviewStatus = newStatus;
  document.reviewedBy = reviewerId;
  document.reviewedAt = new Date();
  document.applicantVisibleNote = input.applicantVisibleNote;
  document.internalNote = input.internalNote;
  document.reviewHistory.push({
    previousStatus,
    newStatus,
    changedBy: reviewerId,
    applicantVisibleNote: input.applicantVisibleNote,
    internalNote: input.internalNote,
    reason: input.reason,
  });

  await document.save();
  await document.populate('reviewedBy', 'displayName email');

  const statusMessages = {
    approved: {
      title: 'Document approved',
      message: `${document.title} was approved.`,
    },
    rejected: {
      title: 'Document rejected',
      message: `${document.title} was rejected. Review the note and upload corrected evidence where permitted.`,
    },
    replacement_requested: {
      title: 'Document replacement requested',
      message: `${document.title} requires a replacement. Review the document note before uploading a new version.`,
    },
  };
  const notificationCopy = statusMessages[newStatus] || {
    title: 'Document status updated',
    message: `${document.title} has a new review status.`,
  };

  await createNotificationSafely({
    recipient: document.owner?._id || document.owner,
    type: NOTIFICATION_TYPES.DOCUMENT_UPDATE,
    category: NOTIFICATION_CATEGORIES.DOCUMENT,
    title: notificationCopy.title,
    message: notificationCopy.message,
    actionUrl: '/dashboard/documents',
    application: document.application?._id || document.application,
    document: document._id,
    reference: document.application?.reference || '',
    dedupeKey: `document-review:${document.id}:${document.reviewHistory.length}`,
    createdBy: reviewerId,
  });

  return serializeDocument(document, { reviewer: true });
}
