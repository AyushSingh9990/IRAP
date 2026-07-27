import { environment } from '../config/environment.js';
import { logger } from '../config/logger.js';
import {
  APPLICATION_PURPOSES,
} from '../constants/applicationPurposes.js';
import { APPLICATION_STATUSES } from '../constants/applicationStatuses.js';
import { APPLICATION_TYPE_LABELS } from '../constants/applicationTypes.js';
import {
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
} from '../constants/auditActions.js';
import {
  CERTIFICATE_STATUSES,
  DEFAULT_REGISTRATION_PREFIXES,
  MEMBERSHIP_ADMIN_ACTIONS,
  MEMBERSHIP_PAYMENT_STATUSES,
  MEMBERSHIP_STATUSES,
  MEMBERSHIP_TYPE_LABELS,
} from '../constants/membershipConstants.js';
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_TYPES,
} from '../constants/notificationConstants.js';
import { PAYMENT_STATUSES } from '../constants/paymentConstants.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { ROLES } from '../constants/roles.js';
import Application from '../models/Application.js';
import ApplicationReview from '../models/ApplicationReview.js';
import Certificate from '../models/Certificate.js';
import Membership from '../models/Membership.js';
import MembershipPolicy from '../models/MembershipPolicy.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { generateApplicationReference } from '../utils/generateReference.js';
import {
  completeAuditEntry,
  failAuditEntry,
  recordSuccessfulAudit,
  startAuditEntry,
} from './auditLog.service.js';
import {
  createCertificateRecord,
  findMembershipForCertificate,
  listCertificateHistory,
  resolveApprovedCertificateName,
  resolveDirectoryConsent,
  revokeCertificate,
  synchronizeCurrentCertificateStatus,
} from './certificate.service.js';
import { createNotificationSafely } from './notification.service.js';
import { generateSequentialRegistryNumber } from './registryNumber.service.js';

const ROLE_FOR_TYPE = Object.freeze({
  member: ROLES.MEMBER,
  training_provider: ROLES.TRAINING_PROVIDER,
  organization: ROLES.ORGANIZATION,
});

function asId(value) {
  return value?._id?.toString?.() || value?.toString?.() || String(value || '');
}

function startOfUtcDay(value = new Date()) {
  const date = new Date(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(value, days) {
  const date = startOfUtcDay(value);
  date.setUTCDate(date.getUTCDate() + Number(days));
  return date;
}

function addUtcMonths(value, months) {
  const date = startOfUtcDay(value);
  const originalDay = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + Number(months));
  const lastDay = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
  date.setUTCDate(Math.min(originalDay, lastDay));
  return date;
}

function daysBetweenUtc(from, to) {
  return Math.ceil((startOfUtcDay(to).getTime() - startOfUtcDay(from).getTime()) / 86_400_000);
}

function policyValidityMonths(policy, type) {
  return {
    member: policy.validityMonths.member,
    training_provider: policy.validityMonths.trainingProvider,
    organization: policy.validityMonths.organization,
  }[type];
}

function policyRegistrationPrefix(policy, type) {
  return {
    member: policy.registrationPrefixes.member,
    training_provider: policy.registrationPrefixes.trainingProvider,
    organization: policy.registrationPrefixes.organization,
  }[type] || DEFAULT_REGISTRATION_PREFIXES[type];
}

function actorContext(context = {}) {
  return {
    ipAddress: context.ipAddress || '',
    userAgent: context.userAgent || '',
    requestId: context.requestId || '',
  };
}

function safeOwner(owner) {
  if (!owner) return null;
  return {
    id: asId(owner),
    displayName:
      owner.displayName || `${owner.firstName || ''} ${owner.lastName || ''}`.trim(),
    email: owner.email,
    roles: owner.roles || [],
    accountStatus: owner.accountStatus,
  };
}

function safeCertificate(certificate) {
  if (!certificate) return null;
  const value = certificate.toJSON ? certificate.toJSON() : certificate;
  return {
    id: asId(value),
    certificateNumber: value.certificateNumber,
    registrationNumber: value.registrationNumber,
    verificationCode: value.verificationCode,
    verificationUrl: value.verificationUrl,
    type: value.type,
    certificateTitle: value.certificateTitle,
    holderName: value.holderName,
    issueDate: value.issueDate,
    expiryDate: value.expiryDate,
    status: value.status,
    authorizedSignatory: value.authorizedSignatory,
    replaces: value.replaces ? asId(value.replaces) : null,
    replacedBy: value.replacedBy ? asId(value.replacedBy) : null,
    revokedAt: value.revokedAt,
    revocationReason: value.revocationReason || '',
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function safeApplication(application) {
  if (!application) return null;
  const value = application.toObject
    ? application.toObject({ flattenMaps: true, transform: false })
    : application;
  return {
    id: asId(value),
    owner: safeOwner(value.owner),
    reference: value.reference,
    type: value.type,
    typeLabel: APPLICATION_TYPE_LABELS[value.type] || value.type,
    purpose: value.purpose || APPLICATION_PURPOSES.INITIAL,
    status: value.status,
    completionPercentage: value.completionPercentage,
    submittedAt: value.submittedAt,
    updatedAt: value.updatedAt,
  };
}

function safeMembership(membership, certificates = []) {
  const value = membership.toObject ? membership.toObject() : membership;
  return {
    id: asId(value),
    owner: safeOwner(value.owner),
    application: safeApplication(value.application),
    currentApplication: safeApplication(value.currentApplication),
    type: value.type,
    typeLabel: MEMBERSHIP_TYPE_LABELS[value.type] || value.type,
    registrationNumber: value.registrationNumber,
    approvedName: value.approvedName,
    status: value.status,
    validFrom: value.validFrom,
    validUntil: value.validUntil,
    renewalOpensAt: value.renewalOpensAt,
    graceEndsAt: value.graceEndsAt,
    renewalDate: value.renewalDate,
    paymentStatus: value.paymentStatus,
    approvalDate: value.approvalDate,
    approvedBy: safeOwner(value.approvedBy),
    directoryVisible: value.directoryVisible,
    currentCertificate: safeCertificate(value.currentCertificate),
    renewalCycle: value.renewalCycle,
    statusHistory: value.statusHistory || [],
    renewalHistory: value.renewalHistory || [],
    certificates: certificates.map(safeCertificate),
    suspendedAt: value.suspendedAt,
    suspensionReason: value.suspensionReason || '',
    revokedAt: value.revokedAt,
    revocationReason: value.revocationReason || '',
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

export async function getMembershipPolicy() {
  return MembershipPolicy.findOne({ key: 'default' })
    .populate('updatedBy', 'displayName firstName lastName email roles accountStatus');
}

export async function assertMembershipPolicyConfigured() {
  const policy = await getMembershipPolicy();
  if (!policy) {
    throw new ApiError(
      409,
      'Membership issuance policy is not configured.',
      [
        {
          field: 'membershipPolicy',
          message: 'Configure validity, reminders, prefixes and authorized signatory details.',
        },
      ],
    );
  }
  return policy;
}

export async function updateMembershipPolicy({ actor, input, context }) {
  const previous = await MembershipPolicy.findOne({ key: 'default' }).lean();
  const policy = await MembershipPolicy.findOneAndUpdate(
    { key: 'default' },
    {
      $set: {
        validityMonths: input.validityMonths,
        renewalWindowDays: input.renewalWindowDays,
        gracePeriodDays: input.gracePeriodDays,
        reminderDays: [...new Set(input.reminderDays)].sort((a, b) => b - a),
        registrationPrefixes: input.registrationPrefixes,
        certificatePrefix: input.certificatePrefix,
        authorizedSignatory: input.authorizedSignatory,
        updatedBy: actor.userId,
      },
      $setOnInsert: { key: 'default' },
    },
    { new: true, upsert: true, runValidators: true },
  ).populate('updatedBy', 'displayName firstName lastName email roles accountStatus');

  await recordSuccessfulAudit(
    {
      action: AUDIT_ACTIONS.MEMBERSHIP_POLICY_UPDATED,
      actor,
      entityType: AUDIT_ENTITY_TYPES.MEMBERSHIP_POLICY,
      entityId: asId(policy),
      previousValues: previous || {},
      context: actorContext(context),
    },
    policy.toJSON(),
  );

  return policy.toJSON();
}

async function paymentStatusForApplication(application) {
  if (!environment.applicationPaymentRequired) {
    return MEMBERSHIP_PAYMENT_STATUSES.NOT_REQUIRED;
  }

  const [confirmedPayment, review] = await Promise.all([
    Payment.findOne({
      application: application._id,
      status: {
        $in: [
          PAYMENT_STATUSES.CAPTURED,
          PAYMENT_STATUSES.PARTIALLY_REFUNDED,
          PAYMENT_STATUSES.REFUNDED,
        ],
      },
    }).select('status'),
    ApplicationReview.findOne({ application: application._id }).select('paymentWaiver'),
  ]);

  if (confirmedPayment) {
    return confirmedPayment.status === PAYMENT_STATUSES.REFUNDED
      ? MEMBERSHIP_PAYMENT_STATUSES.REFUNDED
      : MEMBERSHIP_PAYMENT_STATUSES.CONFIRMED;
  }
  if (review?.paymentWaiver?.waived) return MEMBERSHIP_PAYMENT_STATUSES.WAIVED;
  return MEMBERSHIP_PAYMENT_STATUSES.PENDING;
}

function approvalActor(application) {
  const approvedHistory = [...(application.statusHistory || [])]
    .reverse()
    .find((entry) => entry.newStatus === APPLICATION_STATUSES.APPROVED);
  return approvedHistory?.changedBy || null;
}

function calculateValidityDates({ startDate, policy, type }) {
  const validFrom = startOfUtcDay(startDate);
  const validUntil = addUtcMonths(validFrom, policyValidityMonths(policy, type));
  const renewalOpensAt = addUtcDays(validUntil, -policy.renewalWindowDays);
  const graceEndsAt = addUtcDays(validUntil, policy.gracePeriodDays);
  return {
    validFrom,
    validUntil,
    renewalOpensAt,
    graceEndsAt,
    renewalDate: renewalOpensAt,
  };
}

function currentStatusForDates(membership, now = new Date()) {
  if (membership.status === MEMBERSHIP_STATUSES.REVOKED) return MEMBERSHIP_STATUSES.REVOKED;
  if (membership.status === MEMBERSHIP_STATUSES.SUSPENDED) return MEMBERSHIP_STATUSES.SUSPENDED;
  const timestamp = now.getTime();
  if (timestamp > membership.graceEndsAt.getTime()) return MEMBERSHIP_STATUSES.EXPIRED;
  if (timestamp > membership.validUntil.getTime()) return MEMBERSHIP_STATUSES.GRACE_PERIOD;
  if (timestamp >= membership.renewalOpensAt.getTime()) return MEMBERSHIP_STATUSES.RENEWAL_DUE;
  return MEMBERSHIP_STATUSES.ACTIVE;
}

async function populateMembership(membership) {
  await membership.populate([
    { path: 'owner', select: 'displayName firstName lastName email roles accountStatus' },
    { path: 'application', select: 'reference type purpose status submittedAt completionPercentage updatedAt' },
    { path: 'currentApplication', select: 'reference type purpose status submittedAt completionPercentage updatedAt' },
    { path: 'approvedBy', select: 'displayName firstName lastName email roles accountStatus' },
    { path: 'currentCertificate' },
  ]);
  return membership;
}

async function createInitialMembership({ application, actor, policy, context }) {
  const existing = await Membership.findOne({
    $or: [
      { application: application._id },
      { owner: application.owner, type: application.type },
    ],
  });
  if (existing) {
    if (!existing.currentCertificate) {
      const replacementCertificate = await createCertificateRecord({
        membership: existing,
        application,
        policy,
        issuedBy: actor.userId,
        reason: 'Current certificate repaired for an existing approved registry record.',
      });
      existing.currentCertificate = replacementCertificate._id;
      await existing.save();
    }
    await populateMembership(existing);
    return existing;
  }

  const owner = await User.findById(application.owner);
  if (!owner) throw new ApiError(404, 'Approved account not found.');
  const approvedName = resolveApprovedCertificateName(application, owner);
  const paymentStatus = await paymentStatusForApplication(application);
  if (paymentStatus === MEMBERSHIP_PAYMENT_STATUSES.PENDING) {
    throw new ApiError(409, 'Payment must be confirmed or waived before membership issuance.');
  }

  const approvedBy = approvalActor(application) || actor.userId;
  const approvalDate =
    [...(application.statusHistory || [])]
      .reverse()
      .find((entry) => entry.newStatus === APPLICATION_STATUSES.APPROVED)?.changedAt ||
    new Date();
  const dates = calculateValidityDates({
    startDate: approvalDate,
    policy,
    type: application.type,
  });
  const registrationNumber = await generateSequentialRegistryNumber({
    category: `registration:${application.type}`,
    prefix: policyRegistrationPrefix(policy, application.type),
  });

  const membership = await Membership.create({
    owner: application.owner,
    application: application._id,
    currentApplication: application._id,
    type: application.type,
    registrationNumber,
    approvedName,
    status: MEMBERSHIP_STATUSES.ACTIVE,
    ...dates,
    paymentStatus,
    approvalDate,
    approvedBy,
    directoryVisible: resolveDirectoryConsent(application),
    statusHistory: [
      {
        previousStatus: null,
        newStatus: MEMBERSHIP_STATUSES.ACTIVE,
        changedBy: approvedBy,
        reason: 'Membership or accreditation record issued from an approved application.',
      },
    ],
  });

  const certificate = await createCertificateRecord({
    membership,
    application,
    policy,
    issuedBy: approvedBy,
  });
  membership.currentCertificate = certificate._id;
  await membership.save();

  await recordSuccessfulAudit(
    {
      action: AUDIT_ACTIONS.MEMBERSHIP_ISSUED,
      actor,
      entityType: AUDIT_ENTITY_TYPES.MEMBERSHIP,
      entityId: asId(membership),
      application: application._id,
      subjectUser: application.owner,
      context: actorContext(context),
    },
    {
      registrationNumber: membership.registrationNumber,
      certificateNumber: certificate.certificateNumber,
      validFrom: membership.validFrom,
      validUntil: membership.validUntil,
    },
  );

  await createNotificationSafely({
    recipient: membership.owner,
    type: NOTIFICATION_TYPES.CERTIFICATE_ISSUED,
    category: NOTIFICATION_CATEGORIES.MEMBERSHIP,
    title: 'Membership record and certificate issued',
    message: `${membership.registrationNumber} is active until ${membership.validUntil.toISOString().slice(0, 10)}.`,
    actionUrl: '/dashboard/memberships',
    application: application._id,
    membership: membership._id,
    certificate: certificate._id,
    reference: membership.registrationNumber,
    dedupeKey: `membership-issued:${membership.id}`,
    createdBy: actor.userId,
  });

  await populateMembership(membership);
  return membership;
}

async function renewExistingMembership({ application, actor, policy, context }) {
  const membership = await Membership.findOne({
    _id: application.membership,
    owner: application.owner,
    type: application.type,
  });
  if (!membership) throw new ApiError(404, 'Renewal membership record not found.');

  const alreadyRenewed = membership.renewalHistory.some(
    (entry) => asId(entry.application) === asId(application),
  );
  if (alreadyRenewed) {
    await populateMembership(membership);
    return membership;
  }

  const paymentStatus = await paymentStatusForApplication(application);
  if (paymentStatus === MEMBERSHIP_PAYMENT_STATUSES.PENDING) {
    throw new ApiError(409, 'Renewal payment must be confirmed or waived before renewal approval.');
  }

  const approvedBy = approvalActor(application) || actor.userId;
  const approvedAt =
    [...(application.statusHistory || [])]
      .reverse()
      .find((entry) => entry.newStatus === APPLICATION_STATUSES.APPROVED)?.changedAt ||
    new Date();
  const previousStatus = membership.status;
  const previousValidUntil = membership.validUntil;
  const renewalStart = previousValidUntil.getTime() > approvedAt.getTime()
    ? previousValidUntil
    : approvedAt;
  const dates = calculateValidityDates({
    startDate: renewalStart,
    policy,
    type: membership.type,
  });
  const previousCertificate = membership.currentCertificate;

  membership.currentApplication = application._id;
  membership.approvedName = resolveApprovedCertificateName(
    application,
    await User.findById(application.owner),
  );
  membership.validFrom = dates.validFrom;
  membership.validUntil = dates.validUntil;
  membership.renewalOpensAt = dates.renewalOpensAt;
  membership.graceEndsAt = dates.graceEndsAt;
  membership.renewalDate = dates.renewalDate;
  membership.paymentStatus = paymentStatus;
  membership.approvalDate = approvedAt;
  membership.approvedBy = approvedBy;
  membership.directoryVisible = resolveDirectoryConsent(application);
  membership.status = MEMBERSHIP_STATUSES.ACTIVE;
  membership.renewalCycle += 1;
  membership.suspendedAt = null;
  membership.suspendedBy = null;
  membership.suspensionReason = '';
  membership.statusHistory.push({
    previousStatus,
    newStatus: MEMBERSHIP_STATUSES.ACTIVE,
    changedBy: approvedBy,
    reason: 'Renewal application approved.',
  });

  const certificate = await createCertificateRecord({
    membership,
    application,
    policy,
    issuedBy: approvedBy,
    replaces: previousCertificate,
    reason: 'Certificate replaced following approved renewal.',
  });
  membership.currentCertificate = certificate._id;
  membership.renewalHistory.push({
    application: application._id,
    previousValidUntil,
    newValidUntil: membership.validUntil,
    paymentStatus,
    approvedBy,
    approvedAt,
    certificate: certificate._id,
  });
  await membership.save();

  await recordSuccessfulAudit(
    {
      action: AUDIT_ACTIONS.MEMBERSHIP_RENEWED,
      actor,
      entityType: AUDIT_ENTITY_TYPES.MEMBERSHIP,
      entityId: asId(membership),
      application: application._id,
      subjectUser: application.owner,
      previousValues: { validUntil: previousValidUntil, certificate: previousCertificate },
      context: actorContext(context),
    },
    {
      validUntil: membership.validUntil,
      certificate: certificate._id,
      renewalCycle: membership.renewalCycle,
    },
  );

  await createNotificationSafely({
    recipient: membership.owner,
    type: NOTIFICATION_TYPES.MEMBERSHIP_RENEWED,
    category: NOTIFICATION_CATEGORIES.MEMBERSHIP,
    title: 'Membership renewed',
    message: `${membership.registrationNumber} has been renewed until ${membership.validUntil.toISOString().slice(0, 10)}.`,
    actionUrl: '/dashboard/memberships',
    application: application._id,
    membership: membership._id,
    certificate: certificate._id,
    reference: membership.registrationNumber,
    dedupeKey: `membership-renewed:${membership.id}:${membership.renewalCycle}`,
    createdBy: actor.userId,
  });

  await populateMembership(membership);
  return membership;
}

export async function issueMembershipForApprovedApplication({
  applicationId,
  actor,
  context = {},
}) {
  const policy = await assertMembershipPolicyConfigured();
  const application = await Application.findById(applicationId);
  if (!application) throw new ApiError(404, 'Approved application not found.');
  if (application.status !== APPLICATION_STATUSES.APPROVED) {
    throw new ApiError(409, 'Membership records can only be issued from approved applications.');
  }

  if ((application.purpose || APPLICATION_PURPOSES.INITIAL) === APPLICATION_PURPOSES.RENEWAL) {
    return renewExistingMembership({ application, actor, policy, context });
  }
  return createInitialMembership({ application, actor, policy, context });
}

export async function issueMembershipSafely(input) {
  try {
    return await issueMembershipForApprovedApplication(input);
  } catch (error) {
    logger.error(
      {
        error,
        applicationId: String(input.applicationId || ''),
        actorId: String(input.actor?.userId || ''),
      },
      'Approved membership issuance failed',
    );
    return null;
  }
}

export async function listMembershipsForOwner(ownerId) {
  const memberships = await Membership.find({ owner: ownerId }).sort({ createdAt: -1 });
  const results = [];
  for (const membership of memberships) {
    await refreshSingleMembershipStatus(membership, { changedBy: null });
    await populateMembership(membership);
    const certificates = await listCertificateHistory(membership._id);
    results.push(safeMembership(membership, certificates));
  }
  return results;
}

export async function getMembershipForOwner({ membershipId, ownerId }) {
  const membership = await Membership.findOne({ _id: membershipId, owner: ownerId });
  if (!membership) throw new ApiError(404, 'Membership record not found.');
  await refreshSingleMembershipStatus(membership, { changedBy: null });
  await populateMembership(membership);
  const certificates = await listCertificateHistory(membership._id);
  return safeMembership(membership, certificates);
}

export async function createRenewalApplication({ membershipId, ownerId, ipAddress }) {
  await assertMembershipPolicyConfigured();
  const membership = await Membership.findOne({ _id: membershipId, owner: ownerId });
  if (!membership) throw new ApiError(404, 'Membership record not found.');
  await refreshSingleMembershipStatus(membership, { changedBy: null });

  if ([MEMBERSHIP_STATUSES.SUSPENDED, MEMBERSHIP_STATUSES.REVOKED].includes(membership.status)) {
    throw new ApiError(409, 'This membership cannot be renewed while suspended or revoked.');
  }
  if (new Date().getTime() < membership.renewalOpensAt.getTime()) {
    throw new ApiError(
      409,
      `Renewal opens on ${membership.renewalOpensAt.toISOString().slice(0, 10)}.`,
    );
  }
  if (membership.status === MEMBERSHIP_STATUSES.EXPIRED) {
    throw new ApiError(409, 'The grace period has ended. Contact iRAP support for reinstatement.');
  }

  const existingRenewal = await Application.findOne({
    owner: ownerId,
    type: membership.type,
    purpose: APPLICATION_PURPOSES.RENEWAL,
    isCurrent: true,
  });
  if (existingRenewal) return safeApplication(existingRenewal);

  const previousApplication = await Application.findById(membership.currentApplication);
  if (!previousApplication) throw new ApiError(409, 'The approved application record is unavailable.');

  await Application.updateMany(
    { owner: ownerId, type: membership.type, isCurrent: true },
    { $set: { isCurrent: false } },
  );

  const reference = await generateApplicationReference(membership.type);
  const steps = previousApplication.steps instanceof Map
    ? new Map(previousApplication.steps)
    : previousApplication.steps;
  const firstStepKey = steps instanceof Map
    ? [...steps.keys()][0]
    : Object.keys(steps || {})[0];

  const application = await Application.create({
    owner: ownerId,
    type: membership.type,
    purpose: APPLICATION_PURPOSES.RENEWAL,
    membership: membership._id,
    previousApplication: previousApplication._id,
    renewalCycle: membership.renewalCycle + 1,
    reference,
    status: APPLICATION_STATUSES.DRAFT,
    isCurrent: true,
    currentStep: firstStepKey || '',
    completionPercentage: previousApplication.completionPercentage,
    steps,
    lastSavedAt: new Date(),
    statusHistory: [
      {
        previousStatus: null,
        newStatus: APPLICATION_STATUSES.DRAFT,
        changedBy: ownerId,
        ipAddress: ipAddress || '',
        applicantVisibleNote: 'Renewal application created from the latest approved record.',
      },
    ],
  });

  membership.currentApplication = application._id;
  membership.paymentStatus = environment.applicationPaymentRequired
    ? MEMBERSHIP_PAYMENT_STATUSES.PENDING
    : MEMBERSHIP_PAYMENT_STATUSES.NOT_REQUIRED;
  await membership.save();

  await createNotificationSafely({
    recipient: ownerId,
    type: NOTIFICATION_TYPES.RENEWAL_STARTED,
    category: NOTIFICATION_CATEGORIES.MEMBERSHIP,
    title: 'Renewal application started',
    message: `${reference} is ready for review and submission.`,
    actionUrl: `/dashboard/applications/${application.id}`,
    application: application._id,
    membership: membership._id,
    reference,
    dedupeKey: `renewal-started:${application.id}`,
  });

  return safeApplication(application);
}

export async function listMembershipsForAdmin({ filters }) {
  const query = {};
  if (filters.type) query.type = filters.type;
  if (filters.status) query.status = filters.status;
  if (filters.search) {
    const escaped = filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matcher = new RegExp(escaped, 'i');
    const owners = await User.find({
      $or: [{ email: matcher }, { displayName: matcher }, { firstName: matcher }, { lastName: matcher }],
    })
      .select('_id')
      .limit(200)
      .lean();
    query.$or = [
      { registrationNumber: matcher },
      { approvedName: matcher },
      { owner: { $in: owners.map((owner) => owner._id) } },
    ];
  }

  const skip = (filters.page - 1) * filters.limit;
  const [memberships, total, unissuedApplications] = await Promise.all([
    Membership.find(query)
      .populate('owner', 'displayName firstName lastName email roles accountStatus')
      .populate('application', 'reference type purpose status submittedAt completionPercentage updatedAt')
      .populate('currentApplication', 'reference type purpose status submittedAt completionPercentage updatedAt')
      .populate('approvedBy', 'displayName firstName lastName email roles accountStatus')
      .populate('currentCertificate')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(filters.limit),
    Membership.countDocuments(query),
    Application.find({ status: APPLICATION_STATUSES.APPROVED })
      .populate('owner', 'displayName firstName lastName email roles accountStatus')
      .sort({ updatedAt: -1 })
      .limit(100),
  ]);

  const issuedApplicationIds = new Set(
    (await Membership.find({}).distinct('currentApplication')).map(String),
  );
  const pendingIssuance = unissuedApplications
    .filter((application) => !issuedApplicationIds.has(String(application._id)))
    .map(safeApplication);

  return {
    memberships: memberships.map((membership) => safeMembership(membership)),
    unissuedApplications: pendingIssuance,
    meta: {
      page: filters.page,
      limit: filters.limit,
      total,
      pages: Math.max(1, Math.ceil(total / filters.limit)),
    },
  };
}

export async function getMembershipForAdmin(membershipId) {
  const membership = await Membership.findById(membershipId);
  if (!membership) throw new ApiError(404, 'Membership record not found.');
  await populateMembership(membership);
  const certificates = await listCertificateHistory(membership._id);
  return safeMembership(membership, certificates);
}

function roleForMembership(membership) {
  return ROLE_FOR_TYPE[membership.type];
}

export async function updateMembershipStatus({ membershipId, actor, input, context }) {
  const membership = await Membership.findById(membershipId);
  if (!membership) throw new ApiError(404, 'Membership record not found.');
  const previousStatus = membership.status;
  let nextStatus;

  if (input.action === MEMBERSHIP_ADMIN_ACTIONS.SUSPEND) {
    if (previousStatus === MEMBERSHIP_STATUSES.REVOKED) {
      throw new ApiError(409, 'A revoked membership cannot be suspended.');
    }
    nextStatus = MEMBERSHIP_STATUSES.SUSPENDED;
    membership.suspendedAt = new Date();
    membership.suspendedBy = actor.userId;
    membership.suspensionReason = input.reason;
  } else if (input.action === MEMBERSHIP_ADMIN_ACTIONS.REVOKE) {
    nextStatus = MEMBERSHIP_STATUSES.REVOKED;
    membership.revokedAt = new Date();
    membership.revokedBy = actor.userId;
    membership.revocationReason = input.reason;
  } else {
    if (previousStatus === MEMBERSHIP_STATUSES.REVOKED) {
      throw new ApiError(409, 'A revoked membership cannot be reinstated.');
    }
    nextStatus = currentStatusForDates({ ...membership.toObject(), status: MEMBERSHIP_STATUSES.ACTIVE });
    membership.suspendedAt = null;
    membership.suspendedBy = null;
    membership.suspensionReason = '';
  }

  const audit = await startAuditEntry({
    action: {
      [MEMBERSHIP_ADMIN_ACTIONS.SUSPEND]: AUDIT_ACTIONS.MEMBERSHIP_SUSPENDED,
      [MEMBERSHIP_ADMIN_ACTIONS.REINSTATE]: AUDIT_ACTIONS.MEMBERSHIP_REINSTATED,
      [MEMBERSHIP_ADMIN_ACTIONS.REVOKE]: AUDIT_ACTIONS.MEMBERSHIP_REVOKED,
    }[input.action],
    actor,
    entityType: AUDIT_ENTITY_TYPES.MEMBERSHIP,
    entityId: asId(membership),
    application: membership.currentApplication,
    subjectUser: membership.owner,
    reason: input.reason,
    previousValues: { status: previousStatus },
    context: actorContext(context),
  });

  try {
    membership.status = nextStatus;
    membership.statusHistory.push({
      previousStatus,
      newStatus: nextStatus,
      changedBy: actor.userId,
      reason: input.reason,
    });
    await membership.save();

    const owner = await User.findById(membership.owner);
    const approvedRole = roleForMembership(membership);
    if (owner && approvedRole) {
      if ([MEMBERSHIP_STATUSES.SUSPENDED, MEMBERSHIP_STATUSES.REVOKED, MEMBERSHIP_STATUSES.EXPIRED].includes(nextStatus)) {
        owner.roles = owner.roles.filter((role) => role !== approvedRole);
      } else if (!owner.roles.includes(approvedRole)) {
        owner.roles.push(approvedRole);
      }
      await owner.save();
    }

    await synchronizeCurrentCertificateStatus(membership);
    await completeAuditEntry(audit, { status: membership.status });
    await createNotificationSafely({
      recipient: membership.owner,
      type: NOTIFICATION_TYPES.MEMBERSHIP_STATUS_CHANGED,
      category: NOTIFICATION_CATEGORIES.MEMBERSHIP,
      title: `Membership ${membership.status.replaceAll('_', ' ')}`,
      message: input.reason,
      actionUrl: '/dashboard/memberships',
      membership: membership._id,
      certificate: membership.currentCertificate,
      reference: membership.registrationNumber,
      dedupeKey: `membership-status:${membership.id}:${membership.statusHistory.at(-1)._id}`,
      createdBy: actor.userId,
    });
  } catch (error) {
    await failAuditEntry(audit, error);
    throw error;
  }

  await populateMembership(membership);
  return safeMembership(membership);
}

export async function revokeMembershipCertificate({ certificateId, actor, reason, context }) {
  const certificate = await Certificate.findById(certificateId);
  if (!certificate) throw new ApiError(404, 'Certificate not found.');
  const audit = await startAuditEntry({
    action: AUDIT_ACTIONS.CERTIFICATE_REVOKED,
    actor,
    entityType: AUDIT_ENTITY_TYPES.CERTIFICATE,
    entityId: asId(certificate),
    application: certificate.application,
    subjectUser: certificate.owner,
    reason,
    previousValues: { status: certificate.status },
    context: actorContext(context),
  });
  try {
    await revokeCertificate({ certificate, actorId: actor.userId, reason });
    await completeAuditEntry(audit, { status: certificate.status });
    await createNotificationSafely({
      recipient: certificate.owner,
      type: NOTIFICATION_TYPES.CERTIFICATE_REVOKED,
      category: NOTIFICATION_CATEGORIES.MEMBERSHIP,
      title: 'Certificate revoked',
      message: reason,
      actionUrl: '/dashboard/memberships',
      membership: certificate.membership,
      certificate: certificate._id,
      reference: certificate.certificateNumber,
      dedupeKey: `certificate-revoked:${certificate.id}`,
      createdBy: actor.userId,
    });
    return safeCertificate(certificate);
  } catch (error) {
    await failAuditEntry(audit, error);
    throw error;
  }
}

export async function replaceMembershipCertificate({ certificateId, actor, reason, context }) {
  const policy = await assertMembershipPolicyConfigured();
  const oldCertificate = await Certificate.findById(certificateId);
  if (!oldCertificate) throw new ApiError(404, 'Certificate not found.');
  if (oldCertificate.status === CERTIFICATE_STATUSES.REVOKED) {
    throw new ApiError(409, 'A revoked certificate cannot be replaced.');
  }
  if (oldCertificate.replacedBy) {
    throw new ApiError(409, 'This certificate has already been replaced.');
  }
  const membership = await findMembershipForCertificate(oldCertificate);
  if (!membership) throw new ApiError(404, 'Membership record not found.');
  const application = await Application.findById(membership.currentApplication);
  if (!application) throw new ApiError(404, 'Approved application record not found.');

  const audit = await startAuditEntry({
    action: AUDIT_ACTIONS.CERTIFICATE_REPLACED,
    actor,
    entityType: AUDIT_ENTITY_TYPES.CERTIFICATE,
    entityId: asId(oldCertificate),
    application: application._id,
    subjectUser: membership.owner,
    reason,
    previousValues: { certificateNumber: oldCertificate.certificateNumber },
    context: actorContext(context),
  });
  try {
    const certificate = await createCertificateRecord({
      membership,
      application,
      policy,
      issuedBy: actor.userId,
      replaces: oldCertificate._id,
      reason,
    });
    membership.currentCertificate = certificate._id;
    await membership.save();
    await completeAuditEntry(audit, {
      certificateNumber: certificate.certificateNumber,
      verificationCode: certificate.verificationCode,
    });
    await createNotificationSafely({
      recipient: membership.owner,
      type: NOTIFICATION_TYPES.CERTIFICATE_REPLACED,
      category: NOTIFICATION_CATEGORIES.MEMBERSHIP,
      title: 'Replacement certificate issued',
      message: `${certificate.certificateNumber} replaces ${oldCertificate.certificateNumber}.`,
      actionUrl: '/dashboard/memberships',
      membership: membership._id,
      certificate: certificate._id,
      reference: certificate.certificateNumber,
      dedupeKey: `certificate-replaced:${certificate.id}`,
      createdBy: actor.userId,
    });
    return safeCertificate(certificate);
  } catch (error) {
    await failAuditEntry(audit, error);
    throw error;
  }
}

export async function refreshSingleMembershipStatus(
  membership,
  { now = new Date(), changedBy = null } = {},
) {
  const nextStatus = currentStatusForDates(membership, now);
  if (nextStatus === membership.status) return false;
  const previousStatus = membership.status;
  membership.status = nextStatus;
  membership.statusHistory.push({
    previousStatus,
    newStatus: nextStatus,
    changedBy,
    reason: 'Membership status updated from configured validity dates.',
  });
  await membership.save();
  await synchronizeCurrentCertificateStatus(membership);

  if (nextStatus === MEMBERSHIP_STATUSES.RENEWAL_DUE) {
    await Application.updateOne(
      {
        _id: membership.currentApplication,
        status: APPLICATION_STATUSES.APPROVED,
      },
      { $set: { status: APPLICATION_STATUSES.RENEWAL_DUE } },
    );
  }
  if (nextStatus === MEMBERSHIP_STATUSES.EXPIRED) {
    await Application.updateOne(
      {
        _id: membership.currentApplication,
        status: { $in: [APPLICATION_STATUSES.APPROVED, APPLICATION_STATUSES.RENEWAL_DUE] },
      },
      { $set: { status: APPLICATION_STATUSES.EXPIRED } },
    );
    const owner = await User.findById(membership.owner);
    const approvedRole = roleForMembership(membership);
    if (owner && approvedRole) {
      owner.roles = owner.roles.filter((role) => role !== approvedRole);
      await owner.save();
    }
  }
  return true;
}

export async function processMembershipRenewals({ now = new Date() } = {}) {
  const policy = await assertMembershipPolicyConfigured();
  const memberships = await Membership.find({
    status: { $nin: [MEMBERSHIP_STATUSES.REVOKED] },
  });
  let statusesUpdated = 0;
  let remindersSent = 0;

  for (const membership of memberships) {
    if (await refreshSingleMembershipStatus(membership, { now, changedBy: null })) {
      statusesUpdated += 1;
    }
    if ([MEMBERSHIP_STATUSES.SUSPENDED, MEMBERSHIP_STATUSES.REVOKED, MEMBERSHIP_STATUSES.EXPIRED].includes(membership.status)) {
      continue;
    }

    const daysRemaining = daysBetweenUtc(now, membership.validUntil);
    const dueOffsets = policy.reminderDays
      .filter((offset) => daysRemaining <= offset)
      .sort((a, b) => a - b);

    for (const daysBeforeExpiry of dueOffsets) {
      const alreadySent = membership.reminderHistory.some(
        (entry) =>
          entry.cycle === membership.renewalCycle &&
          entry.daysBeforeExpiry === daysBeforeExpiry,
      );
      if (alreadySent) continue;

      await createNotificationSafely({
        recipient: membership.owner,
        type: NOTIFICATION_TYPES.RENEWAL_REMINDER,
        category: NOTIFICATION_CATEGORIES.MEMBERSHIP,
        title: daysRemaining <= 0 ? 'Membership renewal is due' : 'Membership renewal reminder',
        message: daysRemaining <= 0
          ? `${membership.registrationNumber} has reached its expiry date. Renew during the configured grace period.`
          : `${membership.registrationNumber} expires in ${Math.max(0, daysRemaining)} day(s).`,
        actionUrl: '/dashboard/memberships',
        membership: membership._id,
        certificate: membership.currentCertificate,
        reference: membership.registrationNumber,
        dedupeKey: `renewal-reminder:${membership.id}:${membership.renewalCycle}:${daysBeforeExpiry}`,
      });
      membership.reminderHistory.push({
        cycle: membership.renewalCycle,
        daysBeforeExpiry,
        sentAt: now,
      });
      remindersSent += 1;
    }
    await membership.save();
  }

  return {
    membershipsChecked: memberships.length,
    statusesUpdated,
    remindersSent,
  };
}

export function canManageMemberships(auth) {
  return auth.permissions.includes(PERMISSIONS.MEMBERSHIP_MANAGE) ||
    auth.permissions.includes(PERMISSIONS.SYSTEM_MANAGE);
}

export async function suspendMembershipForApplicationSafely({
  application,
  actor,
  reason,
  context = {},
}) {
  try {
    const membership = await Membership.findOne({
      owner: application.owner,
      type: application.type,
    });
    if (!membership) return null;
    return await updateMembershipStatus({
      membershipId: membership._id,
      actor,
      input: {
        action: MEMBERSHIP_ADMIN_ACTIONS.SUSPEND,
        reason: reason || 'Approved application suspended by an authorized reviewer.',
      },
      context,
    });
  } catch (error) {
    logger.error(
      { error, applicationId: asId(application), actorId: asId(actor?.userId) },
      'Membership suspension synchronization failed',
    );
    return null;
  }
}
