import mongoose from 'mongoose';
import { customAlphabet } from 'nanoid';
import {
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
} from '../constants/auditActions.js';
import {
  COURSE_CERTIFICATE_STATUSES,
  COURSE_DOCUMENT_CATEGORIES,
  COURSE_REVIEW_CHECKLIST_KEYS,
  COURSE_REVIEW_NOTE_VISIBILITIES,
  COURSE_REVIEW_STATUSES,
  COURSE_STATUSES,
  EDITABLE_COURSE_STATUSES,
  SUBMITTABLE_COURSE_STATUSES,
} from '../constants/courseConstants.js';
import { DOCUMENT_REVIEW_STATUSES } from '../constants/documentStatuses.js';
import {
  MEMBERSHIP_STATUSES,
} from '../constants/membershipConstants.js';
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_TYPES,
} from '../constants/notificationConstants.js';
import {
  PERMISSIONS,
} from '../constants/permissions.js';
import Course from '../models/Course.js';
import CourseAccreditationPolicy from '../models/CourseAccreditationPolicy.js';
import CourseCertificate from '../models/CourseCertificate.js';
import CourseDocument from '../models/CourseDocument.js';
import CourseReview from '../models/CourseReview.js';
import Membership from '../models/Membership.js';
import PublicProfile from '../models/PublicProfile.js';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import {
  completeAuditEntry,
  failAuditEntry,
  recordSuccessfulAudit,
  startAuditEntry,
} from './auditLog.service.js';
import {
  createCourseCertificate,
  synchronizeCourseCertificate,
} from './courseCertificate.service.js';
import {
  currentCourseDocuments,
} from './courseDocument.service.js';
import {
  createNotificationSafely,
} from './notification.service.js';
import { resolveUserPermissions } from './rolePermission.service.js';

const referenceSuffix = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8);

function asId(value) {
  return value?.toString?.() || String(value);
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 150);
}

async function uniquePublicSlug(course, session = null) {
  const base =
    slugify(`${course.title}-${course.accreditationNumber}`) ||
    `course-${asId(course._id).slice(-12)}`;

  let candidate = base;
  let suffix = 2;

  while (
    await PublicProfile.exists({
      slug: candidate,
      profileType: 'course',
    }).session(session)
  ) {
    candidate = `${base.slice(0, 165)}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function providerMembershipEligible(membership) {
  return (
    membership &&
    membership.type === 'training_provider' &&
    [
      MEMBERSHIP_STATUSES.ACTIVE,
      MEMBERSHIP_STATUSES.RENEWAL_DUE,
    ].includes(membership.status) &&
    membership.validUntil?.getTime() >= Date.now()
  );
}

function approvedCoursePubliclyEligible(course, providerMembership) {
  return (
    course?.status === COURSE_STATUSES.APPROVED &&
    providerMembershipEligible(providerMembership) &&
    course.validUntil?.getTime() >= Date.now()
  );
}

async function getEligibleProviderMembership({
  membershipId,
  ownerId,
}) {
  const membership = await Membership.findOne({
    _id: membershipId,
    owner: ownerId,
    type: 'training_provider',
  });

  if (!membership) {
    throw new ApiError(
      404,
      'Training-provider accreditation record not found.',
    );
  }

  if (!providerMembershipEligible(membership)) {
    throw new ApiError(
      409,
      'An active, unexpired training-provider accreditation is required.',
    );
  }

  return membership;
}

function courseReference() {
  return `IRAP-CRS-${new Date().getUTCFullYear()}-${referenceSuffix()}`;
}

function normalizeList(values = []) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function completionPercentage(input) {
  const checks = [
    input.title?.length >= 3,
    input.category?.length >= 2,
    input.summary?.length >= 20,
    input.description?.length >= 50,
    input.learningObjectives?.length >= 1,
    input.targetAudience?.length >= 1,
    input.deliveryMethods?.length >= 1,
    input.language?.length >= 2,
    Number(input.totalLearningHours) >= 0.5,
    Number(input.creditHours) >= 0.5,
    Boolean(input.creditUnit),
    input.assessmentMethod?.length >= 10,
    input.qualityAssurance?.length >= 10,
    input.instructors?.length >= 1,
    input.declarationAccepted === true,
  ];

  return Math.round(
    (checks.filter(Boolean).length / checks.length) * 100,
  );
}

function courseSubmissionErrors(course, documents) {
  const errors = [];

  const requiredText = [
    ['summary', course.summary, 20],
    ['description', course.description, 50],
    ['language', course.language, 2],
    ['assessmentMethod', course.assessmentMethod, 10],
    ['qualityAssurance', course.qualityAssurance, 10],
  ];

  for (const [field, value, minimum] of requiredText) {
    if (String(value || '').trim().length < minimum) {
      errors.push({
        field,
        message: `${field} must contain at least ${minimum} characters.`,
      });
    }
  }

  if (!course.learningObjectives?.length) {
    errors.push({
      field: 'learningObjectives',
      message: 'At least one learning objective is required.',
    });
  }

  if (!course.targetAudience?.length) {
    errors.push({
      field: 'targetAudience',
      message: 'At least one target-audience entry is required.',
    });
  }

  if (!course.deliveryMethods?.length) {
    errors.push({
      field: 'deliveryMethods',
      message: 'At least one delivery method is required.',
    });
  }

  if (!course.totalLearningHours || course.totalLearningHours < 0.5) {
    errors.push({
      field: 'totalLearningHours',
      message: 'Total learning hours are required.',
    });
  }

  if (!course.creditHours || course.creditHours < 0.5) {
    errors.push({
      field: 'creditHours',
      message: 'CPD or CEU hours are required.',
    });
  }

  if (!course.creditUnit) {
    errors.push({
      field: 'creditUnit',
      message: 'Select CPD or CEU.',
    });
  }

  if (!course.instructors?.length) {
    errors.push({
      field: 'instructors',
      message: 'At least one instructor is required.',
    });
  }

  if (!course.declarationAccepted) {
    errors.push({
      field: 'declarationAccepted',
      message: 'The provider declaration must be accepted.',
    });
  }

  const curriculum = documents.some(
    (document) =>
      document.category === COURSE_DOCUMENT_CATEGORIES.CURRICULUM &&
      document.isCurrent &&
      !document.deletedAt,
  );

  if (!curriculum) {
    errors.push({
      field: 'curriculum',
      message: 'Upload a current curriculum document before submission.',
    });
  }

  return errors;
}

function serializeProviderMembership(membership) {
  if (!membership) return null;

  return {
    id: asId(membership._id || membership.id),
    approvedName: membership.approvedName,
    registrationNumber: membership.registrationNumber,
    status: membership.status,
    validUntil: membership.validUntil,
  };
}

function serializeReviewer(user) {
  if (!user) return null;

  return {
    id: asId(user._id || user.id),
    displayName: user.displayName,
    email: user.email,
  };
}

function serializeCourse(course, {
  review = null,
  providerMembership = null,
  reviewer = false,
  certificate = null,
} = {}) {
  const value = course.toObject ? course.toObject() : course;

  const serialized = {
    id: asId(value._id || value.id),
    ownerId: asId(value.owner?._id || value.owner),
    providerMembership:
      serializeProviderMembership(
        providerMembership || value.providerMembership,
      ),
    reference: value.reference,
    title: value.title,
    category: value.category,
    summary: value.summary || '',
    description: value.description || '',
    learningObjectives: value.learningObjectives || [],
    targetAudience: value.targetAudience || [],
    prerequisites: value.prerequisites || [],
    deliveryMethods: value.deliveryMethods || [],
    language: value.language || '',
    totalLearningHours: value.totalLearningHours,
    creditHours: value.creditHours,
    creditUnit: value.creditUnit,
    assessmentMethod: value.assessmentMethod || '',
    qualityAssurance: value.qualityAssurance || '',
    instructors: value.instructors || [],
    scheduleText: value.scheduleText || '',
    priceMinor: value.priceMinor,
    currency: value.currency,
    contactEmail: value.contactEmail || '',
    websiteUrl: value.websiteUrl || '',
    publicVisible: Boolean(value.publicVisible),
    declarationAccepted: Boolean(value.declarationAccepted),
    status: value.status,
    completionPercentage: value.completionPercentage,
    accreditationNumber: value.accreditationNumber || '',
    validFrom: value.validFrom,
    validUntil: value.validUntil,
    currentCertificate: value.currentCertificate
      ? asId(value.currentCertificate)
      : null,
    submittedAt: value.submittedAt,
    approvedAt: value.approvedAt,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    statusHistory: (value.statusHistory || []).map((entry) => ({
      id: asId(entry._id || entry.id),
      previousStatus: entry.previousStatus,
      newStatus: entry.newStatus,
      reason: entry.reason || '',
      providerVisibleNote: entry.providerVisibleNote || '',
      internalNote: reviewer ? entry.internalNote || '' : undefined,
      changedAt: entry.changedAt,
    })),
  };

  if (review) {
    serialized.review = {
      id: asId(review._id || review.id),
      status: review.status,
      assignedReviewer: serializeReviewer(review.assignedReviewer),
      assignedBy: serializeReviewer(review.assignedBy),
      assignedAt: review.assignedAt,
      dueAt: review.dueAt,
      checklist: review.checklist,
      requestedFields: review.requestedFields || [],
      notes: (review.notes || [])
        .filter(
          (note) =>
            reviewer ||
            note.visibility === COURSE_REVIEW_NOTE_VISIBILITIES.PROVIDER,
        )
        .map((note) => ({
          id: asId(note._id || note.id),
          visibility: note.visibility,
          body: note.body,
          createdBy: serializeReviewer(note.createdBy),
          createdAt: note.createdAt,
        })),
      decision: reviewer
        ? review.decision
        : {
            outcome: review.decision?.outcome || null,
            reason: review.decision?.reason || '',
            providerVisibleNote:
              review.decision?.providerVisibleNote || '',
            decidedAt: review.decision?.decidedAt || null,
          },
    };
  }

  if (certificate) {
    serialized.certificate = certificate.toJSON
      ? certificate.toJSON()
      : certificate;
  }

  return serialized;
}

function updateCourseFields(course, input) {
  course.set({
    title: input.title,
    category: input.category,
    summary: input.summary,
    description: input.description,
    learningObjectives: normalizeList(input.learningObjectives),
    targetAudience: normalizeList(input.targetAudience),
    prerequisites: normalizeList(input.prerequisites),
    deliveryMethods: [...new Set(input.deliveryMethods)],
    language: input.language,
    totalLearningHours: input.totalLearningHours,
    creditHours: input.creditHours,
    creditUnit: input.creditUnit,
    assessmentMethod: input.assessmentMethod,
    qualityAssurance: input.qualityAssurance,
    instructors: input.instructors,
    scheduleText: input.scheduleText,
    priceMinor: input.priceMinor,
    currency: input.currency,
    contactEmail: input.contactEmail,
    websiteUrl: input.websiteUrl,
    publicVisible: input.publicVisible,
    declarationAccepted: input.declarationAccepted,
  });

  course.completionPercentage = completionPercentage(input);
}

async function providerCourse(courseId, ownerId) {
  const course = await Course.findOne({
    _id: courseId,
    owner: ownerId,
  }).populate(
    'providerMembership',
    'type approvedName registrationNumber status validUntil',
  );

  if (!course) {
    throw new ApiError(404, 'Course record not found.');
  }

  return course;
}

async function courseWithReview(courseId, { reviewer = false } = {}) {
  const course = await Course.findById(courseId)
    .populate(
      'providerMembership',
      'type approvedName registrationNumber status validUntil directoryVisible',
    )
    .populate('owner', 'displayName email');

  if (!course) {
    throw new ApiError(404, 'Course record not found.');
  }

  const review = await CourseReview.findOne({
    course: course._id,
  })
    .populate('assignedReviewer', 'displayName email roles')
    .populate('assignedBy', 'displayName email roles')
    .populate('notes.createdBy', 'displayName email roles');

  const certificate = course.currentCertificate
    ? await CourseCertificate.findById(course.currentCertificate)
    : null;

  return {
    course,
    review,
    certificate,
    serialized: serializeCourse(course, {
      review,
      providerMembership: course.providerMembership,
      reviewer,
      certificate,
    }),
  };
}

export async function listSelfCourses({
  ownerId,
  filters,
}) {
  const query = { owner: ownerId };

  if (filters.status) query.status = filters.status;

  const skip = (filters.page - 1) * filters.limit;
  const [courses, total] = await Promise.all([
    Course.find(query)
      .populate(
        'providerMembership',
        'type approvedName registrationNumber status validUntil',
      )
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(filters.limit),
    Course.countDocuments(query),
  ]);

  return {
    courses: courses.map((course) =>
      serializeCourse(course, {
        providerMembership: course.providerMembership,
      }),
    ),
    meta: {
      page: filters.page,
      limit: filters.limit,
      total,
      pages: Math.max(1, Math.ceil(total / filters.limit)),
    },
  };
}

export async function createCourseDraft({
  ownerId,
  input,
}) {
  const membership = await getEligibleProviderMembership({
    membershipId: input.providerMembershipId,
    ownerId,
  });

  const course = new Course({
    owner: ownerId,
    providerMembership: membership._id,
    reference: courseReference(),
    title: input.title,
    category: input.category,
    statusHistory: [
      {
        previousStatus: null,
        newStatus: COURSE_STATUSES.DRAFT,
        changedBy: ownerId,
        providerVisibleNote: 'Course draft created.',
      },
    ],
  });

  updateCourseFields(course, input);
  await course.save();

  return serializeCourse(course, {
    providerMembership: membership,
  });
}

export async function getSelfCourse({
  courseId,
  ownerId,
}) {
  const course = await providerCourse(courseId, ownerId);
  const review = await CourseReview.findOne({ course: course._id })
    .populate('assignedReviewer', 'displayName email')
    .populate('notes.createdBy', 'displayName email');
  const certificate = course.currentCertificate
    ? await CourseCertificate.findById(course.currentCertificate)
    : null;

  return serializeCourse(course, {
    review,
    providerMembership: course.providerMembership,
    reviewer: false,
    certificate,
  });
}

export async function updateCourseDraft({
  courseId,
  ownerId,
  input,
}) {
  const course = await providerCourse(courseId, ownerId);

  if (!EDITABLE_COURSE_STATUSES.includes(course.status)) {
    throw new ApiError(
      409,
      'This course cannot be edited in its current status.',
    );
  }

  await getEligibleProviderMembership({
    membershipId: course.providerMembership._id,
    ownerId,
  });

  updateCourseFields(course, input);
  await course.save();

  return serializeCourse(course, {
    providerMembership: course.providerMembership,
  });
}

export async function submitCourseForReview({
  courseId,
  ownerId,
}) {
  const course = await providerCourse(courseId, ownerId);

  if (!SUBMITTABLE_COURSE_STATUSES.includes(course.status)) {
    throw new ApiError(
      409,
      'This course cannot be submitted in its current status.',
    );
  }

  await getEligibleProviderMembership({
    membershipId: course.providerMembership._id,
    ownerId,
  });

  const documents = await CourseDocument.find({
    course: course._id,
    isCurrent: true,
    deletedAt: null,
  });

  const errors = courseSubmissionErrors(course, documents);

  if (errors.length) {
    throw new ApiError(
      422,
      'Complete the course accreditation record before submission.',
      errors,
    );
  }

  const previousStatus = course.status;
  const nextStatus =
    previousStatus === COURSE_STATUSES.INFORMATION_REQUIRED
      ? COURSE_STATUSES.RESUBMITTED
      : COURSE_STATUSES.SUBMITTED;

  course.status = nextStatus;
  course.completionPercentage = 100;
  course.submittedAt = new Date();
  course.statusHistory.push({
    previousStatus,
    newStatus: nextStatus,
    changedBy: ownerId,
    providerVisibleNote:
      nextStatus === COURSE_STATUSES.RESUBMITTED
        ? 'Course accreditation record resubmitted.'
        : 'Course accreditation record submitted.',
  });

  await course.save();

  const review = await CourseReview.findOneAndUpdate(
    { course: course._id },
    {
      $set: {
        status: COURSE_REVIEW_STATUSES.OPEN,
        requestedFields: [],
        lastActivityAt: new Date(),
      },
      $setOnInsert: {
        course: course._id,
      },
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
    },
  );

  await createNotificationSafely({
    recipient: ownerId,
    type: NOTIFICATION_TYPES.COURSE_SUBMITTED,
    category: NOTIFICATION_CATEGORIES.COURSE,
    title: 'Course submitted',
    message: `${course.title} was submitted for accreditation review.`,
    actionUrl: `/dashboard/courses/${course.id}`,
    reference: course.reference,
    dedupeKey: `course-submitted:${course.id}:${course.statusHistory.length}`,
    createdBy: ownerId,
  });

  return serializeCourse(course, {
    review,
    providerMembership: course.providerMembership,
  });
}

export async function getCoursePolicy() {
  const policy = await CourseAccreditationPolicy.findOne({
    key: 'default',
  });

  return policy ? policy.toJSON() : null;
}

export async function updateCoursePolicy({
  actor,
  input,
  context,
}) {
  const previous = await CourseAccreditationPolicy.findOne({
    key: 'default',
  }).lean();

  const policy = await CourseAccreditationPolicy.findOneAndUpdate(
    { key: 'default' },
    {
      $set: {
        validityMonths: input.validityMonths,
        accreditationPrefix: input.accreditationPrefix,
        certificatePrefix: input.certificatePrefix,
        authorizedSignatory: input.authorizedSignatory,
        updatedBy: actor.userId,
      },
      $setOnInsert: { key: 'default' },
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
    },
  );

  await recordSuccessfulAudit(
    {
      action: AUDIT_ACTIONS.COURSE_POLICY_UPDATED,
      actor,
      entityType: AUDIT_ENTITY_TYPES.COURSE_POLICY,
      entityId: policy.id,
      previousValues: previous || {},
      context,
    },
    policy.toJSON(),
  );

  return policy.toJSON();
}

export async function listCourseReviewers() {
  const candidates = await User.find({
    accountStatus: 'active',
  }).select('displayName email roles additionalPermissions');

  const reviewers = [];
  for (const candidate of candidates) {
    const permissions = await resolveUserPermissions(candidate);
    if (permissions.includes(PERMISSIONS.COURSE_REVIEW)) reviewers.push(serializeReviewer(candidate));
  }
  return reviewers;
}

export async function listAdminCourses({
  filters,
  actor,
}) {
  const query = {};

  if (filters.status) query.status = filters.status;

  if (filters.search) {
    const matcher = new RegExp(escapeRegex(filters.search), 'i');
    query.$or = [
      { reference: matcher },
      { title: matcher },
      { category: matcher },
      { accreditationNumber: matcher },
    ];
  }

  if (filters.assignment !== 'all') {
    const reviews = await CourseReview.find(
      filters.assignment === 'mine'
        ? { assignedReviewer: actor.userId }
        : { assignedReviewer: null },
    ).select('course');

    query._id = {
      $in: reviews.map((review) => review.course),
    };
  }

  const skip = (filters.page - 1) * filters.limit;
  const [courses, total] = await Promise.all([
    Course.find(query)
      .populate(
        'providerMembership',
        'type approvedName registrationNumber status validUntil',
      )
      .populate('owner', 'displayName email')
      .sort({ submittedAt: 1, updatedAt: -1 })
      .skip(skip)
      .limit(filters.limit),
    Course.countDocuments(query),
  ]);

  const reviewRecords = await CourseReview.find({
    course: { $in: courses.map((course) => course._id) },
  }).populate('assignedReviewer', 'displayName email');

  const reviews = new Map(
    reviewRecords.map((review) => [
      asId(review.course),
      review,
    ]),
  );

  return {
    courses: courses.map((course) => {
      const serialized = serializeCourse(course, {
        review: reviews.get(course.id),
        providerMembership: course.providerMembership,
        reviewer: true,
      });

      serialized.owner = serializeReviewer(course.owner);
      return serialized;
    }),
    meta: {
      page: filters.page,
      limit: filters.limit,
      total,
      pages: Math.max(1, Math.ceil(total / filters.limit)),
    },
  };
}

export async function getAdminCourse(courseId) {
  return courseWithReview(courseId, { reviewer: true });
}

export async function assignCourseReviewer({
  courseId,
  actor,
  input,
  context,
}) {
  const course = await Course.findById(courseId);

  if (!course) {
    throw new ApiError(404, 'Course record not found.');
  }

  let reviewer = null;

  if (input.reviewerId) {
    reviewer = await User.findOne({
      _id: input.reviewerId,
      accountStatus: 'active',
    });

    const permissions = reviewer ? await resolveUserPermissions(reviewer) : [];

    if (!reviewer || !permissions.includes(PERMISSIONS.COURSE_REVIEW)) {
      throw new ApiError(
        422,
        'Select an active course reviewer.',
      );
    }
  }

  const previous = await CourseReview.findOne({
    course: course._id,
  }).lean();

  const review = await CourseReview.findOneAndUpdate(
    { course: course._id },
    {
      $set: {
        assignedReviewer: reviewer?._id || null,
        assignedBy: actor.userId,
        assignedAt: reviewer ? new Date() : null,
        dueAt: input.dueAt ? new Date(input.dueAt) : null,
        status: COURSE_REVIEW_STATUSES.OPEN,
        lastActivityAt: new Date(),
      },
      $setOnInsert: { course: course._id },
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
    },
  ).populate('assignedReviewer', 'displayName email');

  if (
    [COURSE_STATUSES.SUBMITTED, COURSE_STATUSES.RESUBMITTED].includes(
      course.status,
    )
  ) {
    const previousStatus = course.status;
    course.status = COURSE_STATUSES.UNDER_REVIEW;
    course.statusHistory.push({
      previousStatus,
      newStatus: COURSE_STATUSES.UNDER_REVIEW,
      changedBy: actor.userId,
      providerVisibleNote:
        'Course accreditation review has started.',
    });
    await course.save();
  }

  await recordSuccessfulAudit(
    {
      action: AUDIT_ACTIONS.COURSE_REVIEWER_ASSIGNED,
      actor,
      entityType: AUDIT_ENTITY_TYPES.COURSE_REVIEW,
      entityId: review.id,
      subjectUser: course.owner,
      reason: reviewer
        ? 'Course reviewer assigned.'
        : 'Course reviewer removed.',
      previousValues: previous || {},
      context,
    },
    {
      assignedReviewer: reviewer?.id || null,
      dueAt: review.dueAt,
    },
  );

  return serializeCourse(course, {
    review,
    providerMembership: await Membership.findById(
      course.providerMembership,
    ),
    reviewer: true,
  });
}

export async function updateCourseChecklist({
  courseId,
  actor,
  input,
  context,
}) {
  const review = await CourseReview.findOne({
    course: courseId,
  });

  if (!review) {
    throw new ApiError(
      404,
      'Course review case not found.',
    );
  }

  const previous = { ...review.checklist.toObject() };
  review.checklist = input;
  review.lastActivityAt = new Date();
  await review.save();

  await recordSuccessfulAudit(
    {
      action: AUDIT_ACTIONS.COURSE_CHECKLIST_UPDATED,
      actor,
      entityType: AUDIT_ENTITY_TYPES.COURSE_REVIEW,
      entityId: review.id,
      previousValues: previous,
      context,
    },
    review.checklist.toObject(),
  );

  return review.toJSON();
}

export async function addCourseReviewNote({
  courseId,
  actor,
  input,
  context,
}) {
  const review = await CourseReview.findOne({
    course: courseId,
  });

  if (!review) {
    throw new ApiError(
      404,
      'Course review case not found.',
    );
  }

  review.notes.push({
    visibility: input.visibility,
    body: input.body,
    createdBy: actor.userId,
  });
  review.lastActivityAt = new Date();
  await review.save();

  const action =
    input.visibility === COURSE_REVIEW_NOTE_VISIBILITIES.INTERNAL
      ? AUDIT_ACTIONS.COURSE_NOTE_INTERNAL_ADDED
      : AUDIT_ACTIONS.COURSE_NOTE_PROVIDER_ADDED;

  await recordSuccessfulAudit(
    {
      action,
      actor,
      entityType: AUDIT_ENTITY_TYPES.COURSE_REVIEW,
      entityId: review.id,
      context,
    },
    {
      visibility: input.visibility,
      noteCount: review.notes.length,
    },
  );

  return review.toJSON();
}

export async function requestCourseInformation({
  courseId,
  actor,
  input,
  context,
}) {
  const { course, review } = await courseWithReview(courseId, {
    reviewer: true,
  });

  if (!review) {
    throw new ApiError(
      404,
      'Course review case not found.',
    );
  }

  if (
    ![
      COURSE_STATUSES.SUBMITTED,
      COURSE_STATUSES.RESUBMITTED,
      COURSE_STATUSES.UNDER_REVIEW,
    ].includes(course.status)
  ) {
    throw new ApiError(
      409,
      'Information cannot be requested in the current course status.',
    );
  }

  const previousStatus = course.status;
  course.status = COURSE_STATUSES.INFORMATION_REQUIRED;
  course.statusHistory.push({
    previousStatus,
    newStatus: COURSE_STATUSES.INFORMATION_REQUIRED,
    changedBy: actor.userId,
    reason: input.reason,
    providerVisibleNote: input.providerVisibleNote,
    internalNote: input.internalNote,
  });

  review.status = COURSE_REVIEW_STATUSES.AWAITING_INFORMATION;
  review.requestedFields = normalizeList(input.requestedFields);
  review.notes.push({
    visibility: COURSE_REVIEW_NOTE_VISIBILITIES.PROVIDER,
    body: input.providerVisibleNote,
    createdBy: actor.userId,
  });

  if (input.internalNote) {
    review.notes.push({
      visibility: COURSE_REVIEW_NOTE_VISIBILITIES.INTERNAL,
      body: input.internalNote,
      createdBy: actor.userId,
    });
  }

  review.lastActivityAt = new Date();

  await Promise.all([course.save(), review.save()]);

  await createNotificationSafely({
    recipient: course.owner,
    type: NOTIFICATION_TYPES.COURSE_INFORMATION_REQUIRED,
    category: NOTIFICATION_CATEGORIES.COURSE,
    title: 'Course information required',
    message: input.providerVisibleNote,
    actionUrl: `/dashboard/courses/${course.id}`,
    reference: course.reference,
    dedupeKey: `course-info:${course.id}:${course.statusHistory.length}`,
    createdBy: actor.userId,
  });

  await recordSuccessfulAudit(
    {
      action: AUDIT_ACTIONS.COURSE_INFORMATION_REQUESTED,
      actor,
      entityType: AUDIT_ENTITY_TYPES.COURSE,
      entityId: course.id,
      subjectUser: course.owner,
      reason: input.reason,
      previousValues: { status: previousStatus },
      context,
    },
    {
      status: course.status,
      requestedFields: review.requestedFields,
    },
  );

  return serializeCourse(course, {
    review,
    providerMembership: course.providerMembership,
    reviewer: true,
  });
}

function completeChecklist(review) {
  return COURSE_REVIEW_CHECKLIST_KEYS.every(
    (key) => review.checklist?.[key] === true,
  );
}

async function synchronizeCoursePublicProfile({
  course,
  providerMembership,
  certificate,
  session = null,
}) {
  const existing = await PublicProfile.findOne({
    owner: course.owner,
    membership: providerMembership._id,
    profileType: 'course',
    'course.accreditationNumber': course.accreditationNumber,
  }).session(session);

  const profile =
    existing ||
    new PublicProfile({
      owner: course.owner,
      membership: providerMembership._id,
      profileType: 'course',
      slug: await uniquePublicSlug(course, session),
    });

  profile.set({
    displayName: course.title,
    headline: course.summary,
    biography: course.description,
    modalities: [course.category],
    qualifications: [],
    services: course.targetAudience,
    languages: [course.language],
    deliveryMethods: course.deliveryMethods,
    onlineAvailable: course.deliveryMethods.includes('online'),
    contact: {
      email: course.contactEmail,
      telephone: '',
      website: course.websiteUrl,
      showEmail: Boolean(course.contactEmail),
      showTelephone: false,
      socialLinks: {},
    },
    pricingText:
      course.priceMinor === null
        ? ''
        : `${course.currency} ${(course.priceMinor / 100).toFixed(2)}`,
    trainerInformation: course.instructors
      .map(
        (instructor) =>
          `${instructor.name}${
            instructor.qualifications
              ? ` — ${instructor.qualifications}`
              : ''
          }`,
      )
      .join('\n'),
    course: {
      category: course.category,
      accreditationNumber: course.accreditationNumber,
      providerName: providerMembership.approvedName,
      cpdHours: course.creditHours,
      priceMinor: course.priceMinor,
      currency: course.currency,
      validFrom: course.validFrom,
      validUntil: course.validUntil,
      certificateNumber: certificate.certificateNumber,
      verificationCode: certificate.verificationCode,
      creditUnit: course.creditUnit,
      totalLearningHours: course.totalLearningHours,
    },
    published: approvedCoursePubliclyEligible(
      course,
      providerMembership,
    ),
    seoTitle: course.title,
    seoDescription: course.summary,
    lastPublishedAt: approvedCoursePubliclyEligible(
      course,
      providerMembership,
    )
      ? profile.lastPublishedAt || new Date()
      : null,
  });

  await profile.save(session ? { session } : undefined);
  return profile;
}

export async function approveCourse({
  courseId,
  actor,
  input,
  context,
}) {
  const audit = await startAuditEntry({
    action: AUDIT_ACTIONS.COURSE_APPROVED,
    actor,
    entityType: AUDIT_ENTITY_TYPES.COURSE,
    entityId: courseId,
    reason: input.reason,
    context,
  });

  const session = await mongoose.startSession();

  try {
    let approvedCourse;
    let certificate;

    await session.withTransaction(async () => {
      const course = await Course.findById(courseId)
        .populate(
          'providerMembership',
          'type approvedName registrationNumber status validUntil directoryVisible',
        )
        .session(session);

      const review = await CourseReview.findOne({
        course: courseId,
      }).session(session);

      const policy = await CourseAccreditationPolicy.findOne({
        key: 'default',
      }).session(session);

      if (!course || !review) {
        throw new ApiError(
          404,
          'Course or review case not found.',
        );
      }

      if (!policy) {
        throw new ApiError(
          409,
          'Course accreditation policy is not configured.',
        );
      }

      if (
        ![
          COURSE_STATUSES.SUBMITTED,
          COURSE_STATUSES.RESUBMITTED,
          COURSE_STATUSES.UNDER_REVIEW,
        ].includes(course.status)
      ) {
        throw new ApiError(
          409,
          'This course cannot be approved in its current status.',
        );
      }

      if (!providerMembershipEligible(course.providerMembership)) {
        throw new ApiError(
          409,
          'The training-provider accreditation is not currently eligible.',
        );
      }

      if (!completeChecklist(review)) {
        throw new ApiError(
          422,
          'Complete every course-review checklist item before approval.',
        );
      }

      const documents = await currentCourseDocuments(course._id);

      const hasCurriculum = documents.some(
        (document) =>
          document.category === COURSE_DOCUMENT_CATEGORIES.CURRICULUM,
      );

      if (!hasCurriculum) {
        throw new ApiError(
          422,
          'A current curriculum document is required.',
        );
      }

      const unapproved = documents.filter(
        (document) =>
          document.reviewStatus !== DOCUMENT_REVIEW_STATUSES.APPROVED,
      );

      if (unapproved.length) {
        throw new ApiError(
          422,
          'Every current course document must be approved.',
        );
      }

      const issued = await createCourseCertificate({
        course,
        providerMembership: course.providerMembership,
        policy,
        issuedBy: actor.userId,
        session,
      });

      const previousStatus = course.status;
      course.status = COURSE_STATUSES.APPROVED;
      course.accreditationNumber = issued.accreditationNumber;
      course.validFrom = issued.issueDate;
      course.validUntil = issued.expiryDate;
      course.currentCertificate = issued.certificate._id;
      course.publicVisible = true;
      course.approvedAt = issued.issueDate;
      course.approvedBy = actor.userId;
      course.statusHistory.push({
        previousStatus,
        newStatus: COURSE_STATUSES.APPROVED,
        changedBy: actor.userId,
        reason: input.reason,
        providerVisibleNote:
          input.providerVisibleNote ||
          'Course accreditation approved.',
        internalNote: input.internalNote,
      });

      review.status = COURSE_REVIEW_STATUSES.COMPLETED;
      review.decision = {
        outcome: 'approved',
        reason: input.reason,
        internalNote: input.internalNote,
        providerVisibleNote: input.providerVisibleNote,
        decidedBy: actor.userId,
        decidedAt: new Date(),
      };
      review.lastActivityAt = new Date();

      await synchronizeCoursePublicProfile({
        course,
        providerMembership: course.providerMembership,
        certificate: issued.certificate,
        session,
      });

      await Promise.all([
        course.save({ session }),
        review.save({ session }),
      ]);

      approvedCourse = course;
      certificate = issued.certificate;
    });

    await completeAuditEntry(audit, {
      status: COURSE_STATUSES.APPROVED,
      accreditationNumber: approvedCourse.accreditationNumber,
      certificateId: certificate.id,
    });

    await createNotificationSafely({
      recipient: approvedCourse.owner,
      type: NOTIFICATION_TYPES.COURSE_APPROVED,
      category: NOTIFICATION_CATEGORIES.COURSE,
      title: 'Course accreditation approved',
      message: `${approvedCourse.title} has been approved. Accreditation number: ${approvedCourse.accreditationNumber}.`,
      actionUrl: `/dashboard/courses/${approvedCourse.id}`,
      reference: approvedCourse.reference,
      dedupeKey: `course-approved:${approvedCourse.id}`,
      createdBy: actor.userId,
    });

    return getAdminCourse(approvedCourse.id);
  } catch (error) {
    await failAuditEntry(audit, error);
    throw error;
  } finally {
    await session.endSession();
  }
}

export async function rejectCourse({
  courseId,
  actor,
  input,
  context,
}) {
  const { course, review } = await courseWithReview(courseId, {
    reviewer: true,
  });

  if (!review) {
    throw new ApiError(
      404,
      'Course review case not found.',
    );
  }

  if (
    ![
      COURSE_STATUSES.SUBMITTED,
      COURSE_STATUSES.RESUBMITTED,
      COURSE_STATUSES.UNDER_REVIEW,
    ].includes(course.status)
  ) {
    throw new ApiError(
      409,
      'This course cannot be rejected in its current status.',
    );
  }

  const previousStatus = course.status;
  course.status = COURSE_STATUSES.REJECTED;
  course.statusHistory.push({
    previousStatus,
    newStatus: COURSE_STATUSES.REJECTED,
    changedBy: actor.userId,
    reason: input.reason,
    providerVisibleNote: input.providerVisibleNote,
    internalNote: input.internalNote,
  });

  review.status = COURSE_REVIEW_STATUSES.COMPLETED;
  review.decision = {
    outcome: 'rejected',
    reason: input.reason,
    internalNote: input.internalNote,
    providerVisibleNote: input.providerVisibleNote,
    decidedBy: actor.userId,
    decidedAt: new Date(),
  };
  review.lastActivityAt = new Date();

  await Promise.all([course.save(), review.save()]);

  await PublicProfile.updateMany(
    {
      owner: course.owner,
      profileType: 'course',
      'course.accreditationNumber': course.accreditationNumber,
    },
    {
      $set: { published: false },
    },
  );

  await createNotificationSafely({
    recipient: course.owner,
    type: NOTIFICATION_TYPES.COURSE_REJECTED,
    category: NOTIFICATION_CATEGORIES.COURSE,
    title: 'Course accreditation decision',
    message: input.providerVisibleNote,
    actionUrl: `/dashboard/courses/${course.id}`,
    reference: course.reference,
    dedupeKey: `course-rejected:${course.id}:${course.statusHistory.length}`,
    createdBy: actor.userId,
  });

  await recordSuccessfulAudit(
    {
      action: AUDIT_ACTIONS.COURSE_REJECTED,
      actor,
      entityType: AUDIT_ENTITY_TYPES.COURSE,
      entityId: course.id,
      subjectUser: course.owner,
      reason: input.reason,
      previousValues: { status: previousStatus },
      context,
    },
    { status: course.status },
  );

  return serializeCourse(course, {
    review,
    providerMembership: course.providerMembership,
    reviewer: true,
  });
}

export async function updateCourseAdministrativeStatus({
  courseId,
  actor,
  input,
  context,
}) {
  const expectedConfirmation = input.action.toUpperCase();

  if (input.confirmation !== expectedConfirmation) {
    throw new ApiError(
      422,
      `Enter ${expectedConfirmation} to confirm this action.`,
    );
  }

  const course = await Course.findById(courseId).populate(
    'providerMembership',
    'type approvedName registrationNumber status validUntil',
  );

  if (!course) {
    throw new ApiError(404, 'Course record not found.');
  }

  const transitions = {
    suspend: {
      allowed: [COURSE_STATUSES.APPROVED],
      next: COURSE_STATUSES.SUSPENDED,
      certificate: COURSE_CERTIFICATE_STATUSES.SUSPENDED,
      audit: AUDIT_ACTIONS.COURSE_SUSPENDED,
    },
    reinstate: {
      allowed: [COURSE_STATUSES.SUSPENDED],
      next: COURSE_STATUSES.APPROVED,
      certificate: COURSE_CERTIFICATE_STATUSES.ACTIVE,
      audit: AUDIT_ACTIONS.COURSE_REINSTATED,
    },
    revoke: {
      allowed: [
        COURSE_STATUSES.APPROVED,
        COURSE_STATUSES.SUSPENDED,
      ],
      next: COURSE_STATUSES.REVOKED,
      certificate: COURSE_CERTIFICATE_STATUSES.REVOKED,
      audit: AUDIT_ACTIONS.COURSE_REVOKED,
    },
  };

  const transition = transitions[input.action];

  if (
    input.action === 'reinstate' &&
    (
      !providerMembershipEligible(course.providerMembership) ||
      !course.validUntil ||
      course.validUntil.getTime() < Date.now()
    )
  ) {
    throw new ApiError(
      409,
      'An expired course or an ineligible training-provider accreditation cannot be reinstated.',
    );
  }

  if (!transition.allowed.includes(course.status)) {
    throw new ApiError(
      409,
      `The ${input.action} action is not allowed in the current status.`,
    );
  }

  const previousStatus = course.status;
  course.status = transition.next;

  if (input.action === 'suspend') {
    course.suspendedAt = new Date();
    course.suspendedBy = actor.userId;
  }

  if (input.action === 'reinstate') {
    course.suspendedAt = null;
    course.suspendedBy = null;
    course.publicVisible = true;
  }

  if (input.action === 'revoke') {
    course.revokedAt = new Date();
    course.revokedBy = actor.userId;
  }

  course.statusHistory.push({
    previousStatus,
    newStatus: transition.next,
    changedBy: actor.userId,
    reason: input.reason,
    providerVisibleNote: input.reason,
  });

  await course.save();

  await synchronizeCourseCertificate({
    course,
    actorId: actor.userId,
    status: transition.certificate,
    reason: input.reason,
  });

  await PublicProfile.updateMany(
    {
      owner: course.owner,
      profileType: 'course',
      'course.accreditationNumber': course.accreditationNumber,
    },
    {
      $set: {
        published: input.action === 'reinstate',
        ...(input.action === 'reinstate'
          ? { lastPublishedAt: new Date() }
          : {}),
      },
    },
  );

  await createNotificationSafely({
    recipient: course.owner,
    type: NOTIFICATION_TYPES.COURSE_STATUS_CHANGED,
    category: NOTIFICATION_CATEGORIES.COURSE,
    title: 'Course status changed',
    message: `${course.title} is now ${course.status.replaceAll('_', ' ')}.`,
    actionUrl: `/dashboard/courses/${course.id}`,
    reference: course.reference,
    dedupeKey: `course-status:${course.id}:${course.statusHistory.length}`,
    createdBy: actor.userId,
  });

  await recordSuccessfulAudit(
    {
      action: transition.audit,
      actor,
      entityType: AUDIT_ENTITY_TYPES.COURSE,
      entityId: course.id,
      subjectUser: course.owner,
      reason: input.reason,
      previousValues: { status: previousStatus },
      context,
    },
    { status: course.status },
  );

  return serializeCourse(course, {
    providerMembership: course.providerMembership,
    reviewer: true,
  });
}
