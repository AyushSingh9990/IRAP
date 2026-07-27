import { environment } from '../config/environment.js';
import { APPLICATION_PURPOSES } from '../constants/applicationPurposes.js';
import {
  APPLICATION_STATUSES,
} from '../constants/applicationStatuses.js';
import { APPLICATION_TYPE_LABELS } from '../constants/applicationTypes.js';
import {
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
} from '../constants/auditActions.js';
import { DOCUMENT_REVIEW_STATUSES } from '../constants/documentStatuses.js';
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_TYPES,
} from '../constants/notificationConstants.js';
import { PAYMENT_STATUSES } from '../constants/paymentConstants.js';
import { PERMISSIONS } from '../constants/permissions.js';
import {
  REVIEW_CASE_STATUSES,
  REVIEW_CHECKLIST_KEYS,
  REVIEW_DECISIONS,
  REVIEW_NOTE_VISIBILITIES,
  REVIEW_QUEUE_ASSIGNMENTS,
} from '../constants/reviewConstants.js';
import { ROLES } from '../constants/roles.js';
import Application from '../models/Application.js';
import ApplicationReview from '../models/ApplicationReview.js';
import AuditLog from '../models/AuditLog.js';
import Document from '../models/Document.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import {
  completeAuditEntry,
  failAuditEntry,
  recordSuccessfulAudit,
  startAuditEntry,
} from './auditLog.service.js';
import { appendApplicationStatusHistory } from './applicationStatus.service.js';
import { sendApplicationReviewEmailSafely } from './email.service.js';
import { createNotificationSafely, getNotificationPreferences } from './notification.service.js';
import {
  assertMembershipPolicyConfigured,
  issueMembershipSafely,
  suspendMembershipForApplicationSafely,
} from './membership.service.js';

const ACTIVE_REVIEW_STATUSES = Object.freeze([
  APPLICATION_STATUSES.SUBMITTED,
  APPLICATION_STATUSES.PAYMENT_CONFIRMED,
  APPLICATION_STATUSES.UNDER_REVIEW,
  APPLICATION_STATUSES.ADDITIONAL_INFORMATION_REQUIRED,
  APPLICATION_STATUSES.RESUBMITTED,
  APPLICATION_STATUSES.RENEWAL_SUBMITTED,
]);

const DECISIONABLE_STATUSES = Object.freeze([
  APPLICATION_STATUSES.SUBMITTED,
  APPLICATION_STATUSES.PAYMENT_CONFIRMED,
  APPLICATION_STATUSES.UNDER_REVIEW,
  APPLICATION_STATUSES.RESUBMITTED,
  APPLICATION_STATUSES.RENEWAL_SUBMITTED,
]);

const ASSIGNABLE_STATUSES = Object.freeze([
  ...ACTIVE_REVIEW_STATUSES,
  APPLICATION_STATUSES.APPROVED,
  APPLICATION_STATUSES.SUSPENDED,
]);

const ROLE_FOR_APPLICATION_TYPE = Object.freeze({
  member: ROLES.MEMBER,
  training_provider: ROLES.TRAINING_PROVIDER,
  organization: ROLES.ORGANIZATION,
});

function asId(value) {
  return value?._id?.toString?.() || value?.toString?.() || String(value || '');
}

function canManageAssignments(actor) {
  return actor.permissions.includes(PERMISSIONS.APPLICATION_ASSIGN) ||
    actor.permissions.includes(PERMISSIONS.SYSTEM_MANAGE);
}

function canReadGlobalAudit(actor) {
  return actor.permissions.includes(PERMISSIONS.AUDIT_READ) ||
    actor.permissions.includes(PERMISSIONS.SYSTEM_MANAGE);
}

function actorContext(requestContext = {}) {
  return {
    ipAddress: requestContext.ipAddress || '',
    userAgent: requestContext.userAgent || '',
    requestId: requestContext.requestId || '',
  };
}

function safeUser(user) {
  if (!user) return null;
  return {
    id: asId(user),
    firstName: user.firstName,
    lastName: user.lastName,
    displayName: user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
    email: user.email,
    telephone: user.telephone || '',
    roles: user.roles || [],
    accountStatus: user.accountStatus,
  };
}

function safeReview(review) {
  if (!review) {
    return {
      id: null,
      assignedReviewer: null,
      assignedBy: null,
      assignedAt: null,
      dueAt: null,
      status: REVIEW_CASE_STATUSES.OPEN,
      checklist: {
        requiredDocumentsReviewed: false,
        paymentConfirmedOrWaived: false,
        requiredStandardsMet: false,
        identityDeclarationsChecked: false,
        registrationDataChecked: false,
        membershipDatesChecked: false,
        certificateDataChecked: false,
      },
      paymentWaiver: { waived: false, reason: '', approvedBy: null, approvedAt: null },
      requestedSections: [],
      notes: [],
      decision: {
        outcome: null,
        reason: '',
        internalNote: '',
        applicantVisibleNote: '',
        decidedBy: null,
        decidedAt: null,
      },
      lastActivityAt: null,
    };
  }

  const value = review.toObject ? review.toObject() : review;
  return {
    id: asId(value),
    assignedReviewer: safeUser(value.assignedReviewer),
    assignedBy: safeUser(value.assignedBy),
    assignedAt: value.assignedAt,
    dueAt: value.dueAt,
    status: value.status,
    checklist: value.checklist,
    paymentWaiver: {
      waived: Boolean(value.paymentWaiver?.waived),
      reason: value.paymentWaiver?.reason || '',
      approvedBy: safeUser(value.paymentWaiver?.approvedBy),
      approvedAt: value.paymentWaiver?.approvedAt || null,
    },
    requestedSections: value.requestedSections || [],
    notes: (value.notes || []).map((note) => ({
      id: asId(note),
      visibility: note.visibility,
      body: note.body,
      createdBy: safeUser(note.createdBy),
      createdAt: note.createdAt,
    })),
    decision: {
      outcome: value.decision?.outcome || null,
      reason: value.decision?.reason || '',
      internalNote: value.decision?.internalNote || '',
      applicantVisibleNote: value.decision?.applicantVisibleNote || '',
      decidedBy: safeUser(value.decision?.decidedBy),
      decidedAt: value.decision?.decidedAt || null,
    },
    lastActivityAt: value.lastActivityAt,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function safeApplicationForAdmin(application) {
  const value = application.toObject
    ? application.toObject({ flattenMaps: true, transform: false })
    : application;
  return {
    id: asId(value),
    reference: value.reference,
    type: value.type,
    purpose: value.purpose || APPLICATION_PURPOSES.INITIAL,
    membership: value.membership ? asId(value.membership) : null,
    renewalCycle: value.renewalCycle || 0,
    typeLabel: APPLICATION_TYPE_LABELS[value.type] || value.type,
    status: value.status,
    isCurrent: value.isCurrent,
    currentStep: value.currentStep,
    completionPercentage: value.completionPercentage,
    steps: value.steps instanceof Map ? Object.fromEntries(value.steps) : value.steps || {},
    statusHistory: (value.statusHistory || []).map((entry) => ({
      id: asId(entry),
      previousStatus: entry.previousStatus,
      newStatus: entry.newStatus,
      changedBy: safeUser(entry.changedBy),
      internalNote: entry.internalNote || '',
      applicantVisibleNote: entry.applicantVisibleNote || '',
      reason: entry.reason || '',
      relatedDocument: entry.relatedDocument ? asId(entry.relatedDocument) : null,
      relatedPayment: entry.relatedPayment ? asId(entry.relatedPayment) : null,
      ipAddress: entry.ipAddress || '',
      changedAt: entry.changedAt,
    })),
    submittedAt: value.submittedAt,
    withdrawnAt: value.withdrawnAt,
    lastSavedAt: value.lastSavedAt,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function safePayment(payment) {
  const value = payment.toObject ? payment.toObject() : payment;
  return {
    id: asId(value),
    reference: value.reference,
    provider: value.provider,
    status: value.status,
    currency: value.currency,
    totalMinor: value.totalMinor,
    refundedMinor: value.refundedMinor,
    billing: {
      fullName: value.billing?.fullName || '',
      email: value.billing?.email || '',
      countryCode: value.billing?.countryCode || '',
    },
    planSnapshot: value.planSnapshot,
    paidAt: value.paidAt,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function safeDocument(document) {
  const value = document.toObject ? document.toObject() : document;
  return {
    id: asId(value),
    title: value.title,
    category: value.category,
    originalFilename: value.originalFilename,
    mimeType: value.mimeType,
    sizeBytes: value.sizeBytes,
    reviewStatus: value.reviewStatus,
    applicantVisibleNote: value.applicantVisibleNote || '',
    internalNote: value.internalNote || '',
    expiryDate: value.expiryDate,
    reviewedBy: safeUser(value.reviewedBy),
    reviewedAt: value.reviewedAt,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function safeAudit(entry) {
  const value = entry.toObject ? entry.toObject() : entry;
  return {
    id: asId(value),
    action: value.action,
    outcome: value.outcome,
    actor: safeUser(value.actor),
    actorRoles: value.actorRoles || [],
    entityType: value.entityType,
    entityId: value.entityId,
    application: value.application
      ? {
          id: asId(value.application),
          reference: value.application.reference,
          type: value.application.type,
          status: value.application.status,
        }
      : null,
    subjectUser: safeUser(value.subjectUser),
    reason: value.reason || '',
    previousValues: value.previousValues || {},
    newValues: value.newValues || {},
    failureMessage: value.failureMessage || '',
    ipAddress: value.ipAddress || '',
    requestId: value.requestId || '',
    createdAt: value.createdAt,
    completedAt: value.completedAt,
  };
}

async function populateReview(review) {
  if (!review) return null;
  await review.populate([
    { path: 'assignedReviewer', select: 'firstName lastName displayName email roles accountStatus' },
    { path: 'assignedBy', select: 'firstName lastName displayName email roles accountStatus' },
    { path: 'paymentWaiver.approvedBy', select: 'firstName lastName displayName email roles accountStatus' },
    { path: 'notes.createdBy', select: 'firstName lastName displayName email roles accountStatus' },
    { path: 'decision.decidedBy', select: 'firstName lastName displayName email roles accountStatus' },
  ]);
  return review;
}

async function getOrCreateReview(applicationId) {
  return ApplicationReview.findOneAndUpdate(
    { application: applicationId },
    {
      $setOnInsert: {
        application: applicationId,
        status: REVIEW_CASE_STATUSES.OPEN,
        lastActivityAt: new Date(),
      },
    },
    { new: true, upsert: true, runValidators: true },
  );
}

function assertReviewAccess(actor, review) {
  if (canManageAssignments(actor)) return;
  if (!review?.assignedReviewer || asId(review.assignedReviewer) !== asId(actor.userId)) {
    throw new ApiError(403, 'This application is not assigned to your reviewer account.');
  }
}

async function scopedApplicationIds(actor) {
  if (canManageAssignments(actor)) return null;
  return ApplicationReview.find({ assignedReviewer: actor.userId }).distinct('application');
}

async function buildApplicationQuery(actor, filters) {
  const query = {};
  const scopedIds = await scopedApplicationIds(actor);
  if (scopedIds) query._id = { $in: scopedIds };

  if (filters.status) {
    query.status = filters.status;
  } else {
    query.status = {
      $in: [
        ...ACTIVE_REVIEW_STATUSES,
        APPLICATION_STATUSES.APPROVED,
        APPLICATION_STATUSES.REJECTED,
        APPLICATION_STATUSES.SUSPENDED,
      ],
    };
  }
  if (filters.type) query.type = filters.type;

  if (filters.search) {
    const escaped = filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matcher = new RegExp(escaped, 'i');
    const matchingUsers = await User.find({
      $or: [
        { email: matcher },
        { displayName: matcher },
        { firstName: matcher },
        { lastName: matcher },
      ],
    }).select('_id').limit(200).lean();
    const searchConditions = [
      { reference: matcher },
      { owner: { $in: matchingUsers.map((user) => user._id) } },
    ];
    query.$and = [...(query.$and || []), { $or: searchConditions }];
  }

  const reviewerFilter = filters.reviewerId ||
    (filters.assignment === REVIEW_QUEUE_ASSIGNMENTS.MINE ? actor.userId : '');

  if (reviewerFilter) {
    const assignedIds = await ApplicationReview.find({ assignedReviewer: reviewerFilter })
      .distinct('application');
    query.$and = [...(query.$and || []), { _id: { $in: assignedIds } }];
  } else if (filters.assignment === REVIEW_QUEUE_ASSIGNMENTS.UNASSIGNED) {
    const assignedIds = await ApplicationReview.find({ assignedReviewer: { $ne: null } })
      .distinct('application');
    query.$and = [...(query.$and || []), { _id: { $nin: assignedIds } }];
  }

  return query;
}

function sortForQueue(filters) {
  const direction = filters.sortDirection === 'desc' ? -1 : 1;
  const sort = { [filters.sortBy]: direction };
  if (filters.sortBy !== 'reference') sort.reference = 1;
  return sort;
}

export async function getReviewDashboard({ actor }) {
  const scopeIds = await scopedApplicationIds(actor);
  const applicationScope = scopeIds ? { _id: { $in: scopeIds } } : {};
  const reviewScope = scopeIds ? { application: { $in: scopeIds } } : {};
  const now = new Date();
  const dueSoon = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const [statusCountsRaw, unassigned, assignedToMe, overdue, dueSoonCount, recentAudits] =
    await Promise.all([
      Application.aggregate([
        { $match: { ...applicationScope, status: { $ne: APPLICATION_STATUSES.DRAFT } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      canManageAssignments(actor)
        ? Application.countDocuments({
            ...applicationScope,
            status: { $in: ACTIVE_REVIEW_STATUSES },
            _id: {
              $nin: await ApplicationReview.find({ assignedReviewer: { $ne: null } })
                .distinct('application'),
            },
          })
        : 0,
      ApplicationReview.countDocuments({
        ...reviewScope,
        assignedReviewer: actor.userId,
        status: { $in: [REVIEW_CASE_STATUSES.OPEN, REVIEW_CASE_STATUSES.AWAITING_INFORMATION] },
      }),
      ApplicationReview.countDocuments({
        ...reviewScope,
        dueAt: { $lt: now },
        status: { $in: [REVIEW_CASE_STATUSES.OPEN, REVIEW_CASE_STATUSES.AWAITING_INFORMATION] },
      }),
      ApplicationReview.countDocuments({
        ...reviewScope,
        dueAt: { $gte: now, $lte: dueSoon },
        status: { $in: [REVIEW_CASE_STATUSES.OPEN, REVIEW_CASE_STATUSES.AWAITING_INFORMATION] },
      }),
      AuditLog.find(scopeIds ? { application: { $in: scopeIds } } : {})
        .populate('actor', 'firstName lastName displayName email roles accountStatus')
        .populate('application', 'reference type status')
        .sort({ createdAt: -1 })
        .limit(10),
    ]);

  let reviewerWorkloads = [];
  if (canManageAssignments(actor)) {
    reviewerWorkloads = await ApplicationReview.aggregate([
      {
        $match: {
          assignedReviewer: { $ne: null },
          status: { $in: [REVIEW_CASE_STATUSES.OPEN, REVIEW_CASE_STATUSES.AWAITING_INFORMATION] },
        },
      },
      { $group: { _id: '$assignedReviewer', assigned: { $sum: 1 }, overdue: { $sum: { $cond: [{ $and: [{ $ne: ['$dueAt', null] }, { $lt: ['$dueAt', now] }] }, 1, 0] } } } },
      { $sort: { assigned: -1 } },
      { $limit: 20 },
    ]);
    const users = await User.find({ _id: { $in: reviewerWorkloads.map((item) => item._id) } })
      .select('firstName lastName displayName email roles accountStatus');
    const usersById = new Map(users.map((user) => [asId(user), safeUser(user)]));
    reviewerWorkloads = reviewerWorkloads.map((item) => ({
      reviewer: usersById.get(asId(item._id)) || null,
      assigned: item.assigned,
      overdue: item.overdue,
    }));
  }

  return {
    counts: Object.fromEntries(statusCountsRaw.map((item) => [item._id, item.count])),
    unassigned,
    assignedToMe,
    overdue,
    dueSoon: dueSoonCount,
    reviewerWorkloads,
    recentAudit: recentAudits.map(safeAudit),
    permissions: {
      canAssign: canManageAssignments(actor),
      canDecide: actor.permissions.includes(PERMISSIONS.APPLICATION_DECIDE),
      canReadAudit: canReadGlobalAudit(actor),
    },
  };
}

export async function listReviewQueue({ actor, filters }) {
  const query = await buildApplicationQuery(actor, filters);
  const skip = (filters.page - 1) * filters.limit;
  const [applications, total] = await Promise.all([
    Application.find(query)
      .populate('owner', 'firstName lastName displayName email telephone roles accountStatus')
      .sort(sortForQueue(filters))
      .skip(skip)
      .limit(filters.limit),
    Application.countDocuments(query),
  ]);

  const reviews = await ApplicationReview.find({
    application: { $in: applications.map((application) => application._id) },
  })
    .populate('assignedReviewer', 'firstName lastName displayName email roles accountStatus')
    .populate('assignedBy', 'firstName lastName displayName email roles accountStatus');
  const reviewsByApplication = new Map(
    reviews.map((review) => [asId(review.application), safeReview(review)]),
  );

  return {
    applications: applications.map((application) => ({
      ...safeApplicationForAdmin(application),
      owner: safeUser(application.owner),
      review: reviewsByApplication.get(asId(application)) || safeReview(null),
    })),
    meta: {
      page: filters.page,
      limit: filters.limit,
      total,
      pages: Math.max(1, Math.ceil(total / filters.limit)),
    },
  };
}

export async function listReviewers() {
  const reviewers = await User.find({
    accountStatus: 'active',
    roles: { $in: [ROLES.REVIEWER, ROLES.SUPER_ADMIN] },
  })
    .select('firstName lastName displayName email roles accountStatus')
    .sort({ displayName: 1, email: 1 });
  return reviewers.map(safeUser);
}

export async function getReviewWorkspace({ actor, applicationId }) {
  const application = await Application.findById(applicationId)
    .populate('owner', 'firstName lastName displayName email telephone roles accountStatus')
    .populate('statusHistory.changedBy', 'firstName lastName displayName email roles accountStatus');
  if (!application) throw new ApiError(404, 'Application not found.');

  const review = await ApplicationReview.findOne({ application: application._id });
  assertReviewAccess(actor, review);
  await populateReview(review);

  const [documents, payments, audit] = await Promise.all([
    Document.find({ application: application._id, deletedAt: null, isCurrent: true })
      .select('+internalNote')
      .populate('reviewedBy', 'firstName lastName displayName email roles accountStatus')
      .sort({ createdAt: 1 }),
    Payment.find({ application: application._id }).sort({ createdAt: -1 }),
    AuditLog.find({ application: application._id })
      .populate('actor', 'firstName lastName displayName email roles accountStatus')
      .populate('application', 'reference type status')
      .populate('subjectUser', 'firstName lastName displayName email roles accountStatus')
      .sort({ createdAt: -1 })
      .limit(100),
  ]);

  const paymentConfirmed = !environment.applicationPaymentRequired || payments.some((payment) =>
    [PAYMENT_STATUSES.CAPTURED, PAYMENT_STATUSES.PARTIALLY_REFUNDED].includes(payment.status),
  );
  const serializedReview = safeReview(review);
  serializedReview.checklist.paymentConfirmedOrWaived = Boolean(
    paymentConfirmed || serializedReview.paymentWaiver.waived,
  );

  return {
    application: safeApplicationForAdmin(application),
    applicant: safeUser(application.owner),
    review: serializedReview,
    documents: documents.map(safeDocument),
    payments: payments.map(safePayment),
    audit: audit.map(safeAudit),
    paymentConfirmed,
    permissions: {
      canAssign: canManageAssignments(actor),
      canDecide: actor.permissions.includes(PERMISSIONS.APPLICATION_DECIDE),
      canWaivePayment: canManageAssignments(actor),
    },
  };
}

async function loadApplicationAndReview(applicationId) {
  const application = await Application.findById(applicationId);
  if (!application) throw new ApiError(404, 'Application not found.');
  const review = await getOrCreateReview(application._id);
  return { application, review };
}

export async function assignReviewer({ actor, applicationId, reviewerId, dueAt, context }) {
  const { application, review } = await loadApplicationAndReview(applicationId);
  if (!ASSIGNABLE_STATUSES.includes(application.status)) {
    throw new ApiError(409, 'This application cannot be assigned from its current status.');
  }

  let reviewer = null;
  if (reviewerId) {
    reviewer = await User.findOne({
      _id: reviewerId,
      accountStatus: 'active',
      roles: { $in: [ROLES.REVIEWER, ROLES.SUPER_ADMIN] },
    });
    if (!reviewer) throw new ApiError(422, 'Select an active reviewer account.');
  }

  const previousReviewerId = review.assignedReviewer ? asId(review.assignedReviewer) : '';
  const action = reviewerId
    ? previousReviewerId
      ? AUDIT_ACTIONS.REVIEWER_REASSIGNED
      : AUDIT_ACTIONS.REVIEWER_ASSIGNED
    : AUDIT_ACTIONS.REVIEWER_UNASSIGNED;
  const audit = await startAuditEntry({
    action,
    actor,
    entityType: AUDIT_ENTITY_TYPES.APPLICATION_REVIEW,
    entityId: asId(review),
    application: application._id,
    subjectUser: application.owner,
    previousValues: {
      assignedReviewer: previousReviewerId || null,
      dueAt: review.dueAt || null,
      applicationStatus: application.status,
    },
    context: actorContext(context),
  });

  try {
    review.assignedReviewer = reviewer?._id || null;
    review.assignedBy = actor.userId;
    review.assignedAt = reviewer ? new Date() : null;
    review.dueAt = dueAt ? new Date(dueAt) : null;
    review.lastActivityAt = new Date();

    if (
      reviewer &&
      [
        APPLICATION_STATUSES.SUBMITTED,
        APPLICATION_STATUSES.PAYMENT_CONFIRMED,
        APPLICATION_STATUSES.RESUBMITTED,
      ].includes(application.status)
    ) {
      appendApplicationStatusHistory(application, {
        newStatus: APPLICATION_STATUSES.UNDER_REVIEW,
        changedBy: actor.userId,
        ipAddress: context.ipAddress,
        internalNote: 'Application entered review after reviewer assignment.',
        applicantVisibleNote: 'Your application is now under review.',
      });
      await application.save();
    }

    await review.save();
    await populateReview(review);
    await completeAuditEntry(audit, {
      assignedReviewer: reviewer ? asId(reviewer) : null,
      dueAt: review.dueAt,
      applicationStatus: application.status,
    });

    if (reviewer) {
      await createNotificationSafely({
        recipient: reviewer._id,
        type: NOTIFICATION_TYPES.APPLICATION_UPDATE,
        category: NOTIFICATION_CATEGORIES.APPLICATION,
        title: 'Application assigned for review',
        message: `${application.reference} has been assigned to you.`,
        actionUrl: `/admin/applications/${application.id}`,
        application: application._id,
        reference: application.reference,
        createdBy: actor.userId,
        dedupeKey: `review-assignment:${application.id}:${reviewer.id}:${review.assignedAt.toISOString()}`,
      });
    }

    return {
      application: safeApplicationForAdmin(application),
      review: safeReview(review),
    };
  } catch (error) {
    await failAuditEntry(audit, error);
    throw error;
  }
}

export async function bulkAssignReviewer({ actor, applicationIds, reviewerId, dueAt, context }) {
  const results = [];
  for (const applicationId of [...new Set(applicationIds)]) {
    try {
      const result = await assignReviewer({
        actor,
        applicationId,
        reviewerId,
        dueAt,
        context,
      });
      results.push({ applicationId, success: true, review: result.review });
    } catch (error) {
      results.push({ applicationId, success: false, message: error.message });
    }
  }
  return {
    results,
    succeeded: results.filter((item) => item.success).length,
    failed: results.filter((item) => !item.success).length,
  };
}

export async function addReviewNote({ actor, applicationId, input, context }) {
  const { application, review } = await loadApplicationAndReview(applicationId);
  assertReviewAccess(actor, review);
  const action = input.visibility === REVIEW_NOTE_VISIBILITIES.INTERNAL
    ? AUDIT_ACTIONS.REVIEW_NOTE_INTERNAL_ADDED
    : AUDIT_ACTIONS.REVIEW_NOTE_APPLICANT_ADDED;

  review.notes.push({
    visibility: input.visibility,
    body: input.body,
    createdBy: actor.userId,
    createdAt: new Date(),
  });
  review.lastActivityAt = new Date();
  await review.save();
  await recordSuccessfulAudit({
    action,
    actor,
    entityType: AUDIT_ENTITY_TYPES.APPLICATION_REVIEW,
    entityId: asId(review),
    application: application._id,
    subjectUser: application.owner,
    reason: input.visibility === REVIEW_NOTE_VISIBILITIES.APPLICANT ? input.body : '',
    context: actorContext(context),
  }, { visibility: input.visibility, noteId: asId(review.notes.at(-1)) });

  if (input.visibility === REVIEW_NOTE_VISIBILITIES.APPLICANT) {
    await notifyApplicationOwner({
      application,
      actor,
      title: 'New application review message',
      message: input.body,
      emailSubject: `Update for ${application.reference}`,
      dedupeKey: `review-note:${application.id}:${asId(review.notes.at(-1))}`,
    });
  }

  await populateReview(review);
  return safeReview(review);
}

export async function updateReviewChecklist({ actor, applicationId, input, context }) {
  const { application, review } = await loadApplicationAndReview(applicationId);
  assertReviewAccess(actor, review);
  const previousValues = Object.fromEntries(
    REVIEW_CHECKLIST_KEYS.map((key) => [key, Boolean(review.checklist?.[key])]),
  );
  for (const key of REVIEW_CHECKLIST_KEYS) {
    review.checklist[key] = input[key];
  }
  review.lastActivityAt = new Date();
  await review.save();
  await recordSuccessfulAudit({
    action: AUDIT_ACTIONS.REVIEW_CHECKLIST_UPDATED,
    actor,
    entityType: AUDIT_ENTITY_TYPES.APPLICATION_REVIEW,
    entityId: asId(review),
    application: application._id,
    subjectUser: application.owner,
    previousValues,
    context: actorContext(context),
  }, Object.fromEntries(REVIEW_CHECKLIST_KEYS.map((key) => [key, input[key]])));
  await populateReview(review);
  return safeReview(review);
}

export async function updatePaymentWaiver({ actor, applicationId, input, context }) {
  const { application, review } = await loadApplicationAndReview(applicationId);
  const previous = {
    waived: Boolean(review.paymentWaiver?.waived),
    reason: review.paymentWaiver?.reason || '',
  };
  review.paymentWaiver = input.waived
    ? {
        waived: true,
        reason: input.reason,
        approvedBy: actor.userId,
        approvedAt: new Date(),
      }
    : {
        waived: false,
        reason: '',
        approvedBy: null,
        approvedAt: null,
      };
  review.lastActivityAt = new Date();
  await review.save();
  await recordSuccessfulAudit({
    action: input.waived
      ? AUDIT_ACTIONS.REVIEW_PAYMENT_WAIVED
      : AUDIT_ACTIONS.REVIEW_PAYMENT_WAIVER_REMOVED,
    actor,
    entityType: AUDIT_ENTITY_TYPES.APPLICATION_REVIEW,
    entityId: asId(review),
    application: application._id,
    subjectUser: application.owner,
    reason: input.reason,
    previousValues: previous,
    context: actorContext(context),
  }, { waived: input.waived, reason: input.reason });
  await populateReview(review);
  return safeReview(review);
}

async function notifyApplicationOwner({
  application,
  actor,
  title,
  message,
  emailSubject,
  dedupeKey,
}) {
  await createNotificationSafely({
    recipient: application.owner,
    type: NOTIFICATION_TYPES.APPLICATION_UPDATE,
    category: NOTIFICATION_CATEGORIES.APPLICATION,
    title,
    message,
    actionUrl: `/dashboard/applications/${application.id}`,
    application: application._id,
    reference: application.reference,
    createdBy: actor.userId,
    dedupeKey,
  });

  const [owner, preferences] = await Promise.all([
    User.findById(application.owner).select('firstName lastName displayName email'),
    getNotificationPreferences(application.owner),
  ]);
  if (owner && preferences.emailEnabled && preferences.applicationUpdates) {
    await sendApplicationReviewEmailSafely({
      user: owner,
      subject: emailSubject,
      heading: title,
      message,
      applicationReference: application.reference,
    });
  }
}

export async function requestAdditionalInformation({ actor, applicationId, input, context }) {
  const { application, review } = await loadApplicationAndReview(applicationId);
  assertReviewAccess(actor, review);

  const availableSections = new Set(
    application.steps instanceof Map
      ? [...application.steps.keys()]
      : Object.keys(application.steps || {}),
  );
  const requestedSections = [...new Set(input.requestedSections)];
  const invalidSections = requestedSections.filter((section) => !availableSections.has(section));
  if (invalidSections.length > 0) {
    throw new ApiError(
      422,
      'Select only sections that exist in this application.',
      invalidSections.map((section) => ({
        field: 'requestedSections',
        message: `Unknown application section: ${section}`,
      })),
    );
  }
  if (!DECISIONABLE_STATUSES.includes(application.status)) {
    throw new ApiError(409, 'Information cannot be requested from the current application status.');
  }

  const audit = await startAuditEntry({
    action: AUDIT_ACTIONS.APPLICATION_INFORMATION_REQUESTED,
    actor,
    entityType: AUDIT_ENTITY_TYPES.APPLICATION,
    entityId: application.id,
    application: application._id,
    subjectUser: application.owner,
    reason: input.reason,
    previousValues: { status: application.status, requestedSections: review.requestedSections },
    context: actorContext(context),
  });

  try {
    appendApplicationStatusHistory(application, {
      newStatus: APPLICATION_STATUSES.ADDITIONAL_INFORMATION_REQUIRED,
      changedBy: actor.userId,
      ipAddress: context.ipAddress,
      reason: input.reason,
      internalNote: input.internalNote,
      applicantVisibleNote: input.applicantVisibleNote,
    });
    application.currentStep = requestedSections[0] || application.currentStep;
    review.status = REVIEW_CASE_STATUSES.AWAITING_INFORMATION;
    review.requestedSections = requestedSections;
    review.notes.push({
      visibility: REVIEW_NOTE_VISIBILITIES.APPLICANT,
      body: input.applicantVisibleNote,
      createdBy: actor.userId,
      createdAt: new Date(),
    });
    if (input.internalNote) {
      review.notes.push({
        visibility: REVIEW_NOTE_VISIBILITIES.INTERNAL,
        body: input.internalNote,
        createdBy: actor.userId,
        createdAt: new Date(),
      });
    }
    review.lastActivityAt = new Date();
    await Promise.all([application.save(), review.save()]);
    await completeAuditEntry(audit, {
      status: application.status,
      requestedSections: review.requestedSections,
    });
    await notifyApplicationOwner({
      application,
      actor,
      title: 'Additional information required',
      message: input.applicantVisibleNote,
      emailSubject: `Information required for ${application.reference}`,
      dedupeKey: `information-requested:${application.id}:${application.statusHistory.at(-1)._id}`,
    });
    return getReviewWorkspace({ actor, applicationId });
  } catch (error) {
    await failAuditEntry(audit, error);
    throw error;
  }
}

async function calculateApprovalReadiness(application, review) {
  const [payments, documents] = await Promise.all([
    Payment.find({ application: application._id }).select('status'),
    Document.find({ application: application._id, deletedAt: null, isCurrent: true })
      .select('reviewStatus'),
  ]);
  const paymentConfirmed = !environment.applicationPaymentRequired || payments.some((payment) =>
    [PAYMENT_STATUSES.CAPTURED, PAYMENT_STATUSES.PARTIALLY_REFUNDED].includes(payment.status),
  );
  const paymentConfirmedOrWaived = paymentConfirmed || Boolean(review.paymentWaiver?.waived);
  const unresolvedDocuments = documents.filter((document) =>
    document.reviewStatus !== DOCUMENT_REVIEW_STATUSES.APPROVED,
  );
  return { paymentConfirmedOrWaived, unresolvedDocuments };
}

function assertAllChecklistItems(review, readiness) {
  const missing = REVIEW_CHECKLIST_KEYS.filter((key) => !review.checklist?.[key]);
  if (!readiness.paymentConfirmedOrWaived) missing.push('paymentConfirmedOrWaived');
  if (readiness.unresolvedDocuments.length > 0) missing.push('allCurrentDocumentsApproved');
  if (missing.length > 0) {
    throw new ApiError(
      422,
      'Complete every approval check before approving this application.',
      missing.map((field) => ({ field, message: 'This approval requirement is incomplete.' })),
    );
  }
}

async function decideApplication({
  actor,
  applicationId,
  input,
  context,
  decision,
}) {
  const { application, review } = await loadApplicationAndReview(applicationId);
  assertReviewAccess(actor, review);

  const decisionMap = {
    [REVIEW_DECISIONS.APPROVED]: {
      status: APPLICATION_STATUSES.APPROVED,
      action: AUDIT_ACTIONS.APPLICATION_APPROVED,
      reviewStatus: REVIEW_CASE_STATUSES.COMPLETED,
      notificationTitle: 'Application approved',
      defaultMessage: 'Your application has been approved. Membership and certificate records will be created in the issuance workflow.',
    },
    [REVIEW_DECISIONS.REJECTED]: {
      status: APPLICATION_STATUSES.REJECTED,
      action: AUDIT_ACTIONS.APPLICATION_REJECTED,
      reviewStatus: REVIEW_CASE_STATUSES.COMPLETED,
      notificationTitle: 'Application rejected',
      defaultMessage: 'Your application was not approved. Review the decision note for details.',
    },
    [REVIEW_DECISIONS.SUSPENDED]: {
      status: APPLICATION_STATUSES.SUSPENDED,
      action: AUDIT_ACTIONS.APPLICATION_SUSPENDED,
      reviewStatus: REVIEW_CASE_STATUSES.SUSPENDED,
      notificationTitle: 'Application suspended',
      defaultMessage: 'Your approved status has been suspended. Review the decision note for details.',
    },
  };
  const configuration = decisionMap[decision];

  if (decision === REVIEW_DECISIONS.SUSPENDED) {
    if (application.status !== APPLICATION_STATUSES.APPROVED) {
      throw new ApiError(409, 'Only an approved application can be suspended.');
    }
  } else if (!DECISIONABLE_STATUSES.includes(application.status)) {
    throw new ApiError(409, 'This application cannot receive that decision from its current status.');
  }

  if (decision === REVIEW_DECISIONS.APPROVED) {
    await assertMembershipPolicyConfigured();
    const readiness = await calculateApprovalReadiness(application, review);
    assertAllChecklistItems(review, readiness);
    review.checklist.paymentConfirmedOrWaived = readiness.paymentConfirmedOrWaived;
  }

  const audit = await startAuditEntry({
    action: configuration.action,
    actor,
    entityType: AUDIT_ENTITY_TYPES.APPLICATION,
    entityId: application.id,
    application: application._id,
    subjectUser: application.owner,
    reason: input.reason,
    previousValues: {
      status: application.status,
      reviewStatus: review.status,
      decision: review.decision?.outcome || null,
    },
    context: actorContext(context),
  });

  try {
    const applicantMessage = input.applicantVisibleNote || configuration.defaultMessage;
    appendApplicationStatusHistory(application, {
      newStatus: configuration.status,
      changedBy: actor.userId,
      ipAddress: context.ipAddress,
      reason: input.reason,
      internalNote: input.internalNote,
      applicantVisibleNote: applicantMessage,
    });
    if (decision === REVIEW_DECISIONS.REJECTED) application.isCurrent = false;

    const owner = await User.findById(application.owner);
    if (!owner) throw new ApiError(404, 'Applicant account not found.');
    const approvedRole = ROLE_FOR_APPLICATION_TYPE[application.type];
    if (decision === REVIEW_DECISIONS.APPROVED && approvedRole && !owner.roles.includes(approvedRole)) {
      owner.roles.push(approvedRole);
    }
    if (decision === REVIEW_DECISIONS.SUSPENDED && approvedRole) {
      owner.roles = owner.roles.filter((role) => role !== approvedRole);
    }

    review.status = configuration.reviewStatus;
    review.requestedSections = [];
    review.decision = {
      outcome: decision,
      reason: input.reason,
      internalNote: input.internalNote,
      applicantVisibleNote: applicantMessage,
      decidedBy: actor.userId,
      decidedAt: new Date(),
    };
    review.lastActivityAt = new Date();

    await Promise.all([application.save(), review.save(), owner.save()]);

    const membershipResult = decision === REVIEW_DECISIONS.APPROVED
      ? await issueMembershipSafely({
          applicationId: application._id,
          actor,
          context,
        })
      : decision === REVIEW_DECISIONS.SUSPENDED
        ? await suspendMembershipForApplicationSafely({
            application,
            actor,
            reason: input.reason || applicantMessage,
            context,
          })
        : null;

    await completeAuditEntry(audit, {
      status: application.status,
      reviewStatus: review.status,
      decision,
      grantedRole: decision === REVIEW_DECISIONS.APPROVED ? approvedRole : null,
      removedRole: decision === REVIEW_DECISIONS.SUSPENDED ? approvedRole : null,
      membershipRecord: membershipResult?.id || null,
    });
    await notifyApplicationOwner({
      application,
      actor,
      title: configuration.notificationTitle,
      message: applicantMessage,
      emailSubject: `${configuration.notificationTitle}: ${application.reference}`,
      dedupeKey: `${configuration.action}:${application.id}:${application.statusHistory.at(-1)._id}`,
    });
    return getReviewWorkspace({ actor, applicationId });
  } catch (error) {
    await failAuditEntry(audit, error);
    throw error;
  }
}

export function approveApplication(input) {
  return decideApplication({ ...input, decision: REVIEW_DECISIONS.APPROVED });
}

export function rejectApplication(input) {
  return decideApplication({ ...input, decision: REVIEW_DECISIONS.REJECTED });
}

export function suspendApplication(input) {
  return decideApplication({ ...input, decision: REVIEW_DECISIONS.SUSPENDED });
}

export async function listAuditHistory({ actor, filters }) {
  if (!canReadGlobalAudit(actor)) {
    throw new ApiError(403, 'You do not have permission to view the global audit history.');
  }
  const query = {};
  if (filters.action) query.action = filters.action;
  if (filters.outcome) query.outcome = filters.outcome;
  if (filters.applicationId) query.application = filters.applicationId;
  if (filters.search) {
    const escaped = filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matcher = new RegExp(escaped, 'i');
    const [applications, actors] = await Promise.all([
      Application.find({ reference: matcher }).select('_id').limit(200).lean(),
      User.find({ $or: [{ email: matcher }, { displayName: matcher }] })
        .select('_id').limit(200).lean(),
    ]);
    query.$or = [
      { entityId: matcher },
      { reason: matcher },
      { requestId: matcher },
      { application: { $in: applications.map((item) => item._id) } },
      { actor: { $in: actors.map((item) => item._id) } },
    ];
  }
  const skip = (filters.page - 1) * filters.limit;
  const [entries, total] = await Promise.all([
    AuditLog.find(query)
      .populate('actor', 'firstName lastName displayName email roles accountStatus')
      .populate('application', 'reference type status')
      .populate('subjectUser', 'firstName lastName displayName email roles accountStatus')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(filters.limit),
    AuditLog.countDocuments(query),
  ]);
  return {
    entries: entries.map(safeAudit),
    meta: {
      page: filters.page,
      limit: filters.limit,
      total,
      pages: Math.max(1, Math.ceil(total / filters.limit)),
    },
  };
}
