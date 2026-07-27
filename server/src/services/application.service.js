import { environment } from '../config/environment.js';
import { APPLICATION_PURPOSES, APPLICATION_PURPOSE_LABELS } from '../constants/applicationPurposes.js';
import {
  APPLICATION_STATUSES,
  EDITABLE_APPLICATION_STATUSES,
  WITHDRAWABLE_APPLICATION_STATUSES,
} from '../constants/applicationStatuses.js';
import { APPLICATION_TYPE_LABELS } from '../constants/applicationTypes.js';
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_TYPES,
} from '../constants/notificationConstants.js';
import Application from '../models/Application.js';
import ApplicationReview from '../models/ApplicationReview.js';
import User from '../models/User.js';
import { APPLICATION_STEP_DEFINITIONS } from '../schemas/application.schema.js';
import { ApiError } from '../utils/ApiError.js';
import { generateApplicationReference } from '../utils/generateReference.js';
import { createNotificationSafely } from './notification.service.js';
import { appendApplicationStatusHistory } from './applicationStatus.service.js';

function hasAnsweredValue(data, field, definition = {}) {
  if (!Object.prototype.hasOwnProperty.call(data, field)) return false;
  const value = data[field];
  if (definition.mustBeTrueFields?.includes(field)) return value === true;
  if (typeof value === 'boolean' || typeof value === 'number') return true;
  if (Array.isArray(value)) return value.length > 0;
  return value !== null && value !== undefined && String(value).trim() !== '';
}

function getStepDefinition(type, stepKey) {
  const definition = APPLICATION_STEP_DEFINITIONS[type]?.find(
    (step) => step.key === stepKey,
  );
  if (!definition) {
    throw new ApiError(404, 'The requested application step does not exist.');
  }
  return definition;
}

function calculateStepProgress(definition, data) {
  const answered = definition.requiredFields.filter((field) =>
    hasAnsweredValue(data, field, definition),
  ).length;
  return Math.round((answered / definition.requiredFields.length) * 100);
}

function getStoredStep(application, stepKey) {
  const stored = application.steps?.get(stepKey);
  if (!stored) return { data: {}, completionPercentage: 0, completedAt: null };
  return {
    data: stored.data || {},
    completionPercentage: stored.completionPercentage || 0,
    completedAt: stored.completedAt || null,
  };
}

function calculateApplicationProgress(application) {
  const definitions = APPLICATION_STEP_DEFINITIONS[application.type] || [];
  const requiredFieldCount = definitions.reduce(
    (total, step) => total + step.requiredFields.length,
    0,
  );
  const answeredFieldCount = definitions.reduce((total, step) => {
    const data = getStoredStep(application, step.key).data;
    return (
      total +
      step.requiredFields.filter((field) => hasAnsweredValue(data, field, step)).length
    );
  }, 0);

  return requiredFieldCount === 0
    ? 0
    : Math.round((answeredFieldCount / requiredFieldCount) * 100);
}

function serializeApplication(application) {
  const object = application.toJSON();
  object.typeLabel = APPLICATION_TYPE_LABELS[application.type];
  object.purpose = application.purpose || APPLICATION_PURPOSES.INITIAL;
  object.purposeLabel = APPLICATION_PURPOSE_LABELS[object.purpose];
  object.stepDefinitions = APPLICATION_STEP_DEFINITIONS[application.type].map(
    ({ key, label, requiredFields, mustBeTrueFields = [] }) => ({
      key,
      label,
      requiredFields,
      mustBeTrueFields,
    }),
  );
  object.paymentRequired = environment.applicationPaymentRequired;
  return object;
}

async function findOwnedApplication(applicationId, ownerId) {
  const application = await Application.findOne({
    _id: applicationId,
    owner: ownerId,
  });
  if (!application) throw new ApiError(404, 'Application not found.');
  return application;
}

export async function listApplicationsForUser(ownerId) {
  const applications = await Application.find({ owner: ownerId })
    .sort({ isCurrent: -1, updatedAt: -1 });

  return applications.map((application) => serializeApplication(application));
}

export async function createApplicationDraft({ ownerId, type, ipAddress }) {
  const existing = await Application.findOne({ owner: ownerId, type, isCurrent: true });
  if (existing) return serializeApplication(existing);

  const [reference, user] = await Promise.all([
    generateApplicationReference(type),
    User.findById(ownerId),
  ]);
  if (!user) throw new ApiError(404, 'Account not found.');

  if (!user.requestedJourneys.includes(type)) {
    user.requestedJourneys.push(type);
    await user.save();
  }

  const firstStep = APPLICATION_STEP_DEFINITIONS[type][0].key;
  const application = new Application({
    owner: ownerId,
    type,
    purpose: APPLICATION_PURPOSES.INITIAL,
    reference,
    currentStep: firstStep,
    status: APPLICATION_STATUSES.DRAFT,
    statusHistory: [
      {
        previousStatus: null,
        newStatus: APPLICATION_STATUSES.DRAFT,
        changedBy: ownerId,
        ipAddress: ipAddress || '',
        applicantVisibleNote: 'Application draft created.',
      },
    ],
  });
  await application.save();
  return serializeApplication(application);
}

export async function getApplicationForUser(applicationId, ownerId) {
  const application = await findOwnedApplication(applicationId, ownerId);
  return serializeApplication(application);
}

export async function saveApplicationStep({
  applicationId,
  ownerId,
  stepKey,
  data,
  nextStepKey,
}) {
  const application = await findOwnedApplication(applicationId, ownerId);
  if (!EDITABLE_APPLICATION_STATUSES.includes(application.status)) {
    throw new ApiError(409, 'This application can no longer be edited.');
  }

  const definition = getStepDefinition(application.type, stepKey);
  const parsed = definition.schema.safeParse(data);
  const allowedFields = new Set(Object.keys(definition.schema.shape));
  const filteredData = Object.fromEntries(
    Object.entries(data).filter(([key]) => allowedFields.has(key)),
  );
  const sanitizedData = parsed.success ? parsed.data : filteredData;
  const completionPercentage = calculateStepProgress(definition, sanitizedData);

  application.steps.set(stepKey, {
    data: sanitizedData,
    completionPercentage,
    completedAt: parsed.success ? new Date() : null,
    updatedAt: new Date(),
  });
  if (nextStepKey) {
    const validNextSteps = [
      ...APPLICATION_STEP_DEFINITIONS[application.type].map((step) => step.key),
      'review',
    ];
    if (!validNextSteps.includes(nextStepKey)) {
      throw new ApiError(422, 'The requested next application step is invalid.');
    }
  }
  application.currentStep = nextStepKey || stepKey;
  application.lastSavedAt = new Date();
  application.completionPercentage = calculateApplicationProgress(application);
  await application.save();

  return {
    application: serializeApplication(application),
    stepComplete: parsed.success,
    validationErrors: parsed.success
      ? []
      : parsed.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'data',
          message: issue.message,
        })),
  };
}

function validateApplicationForSubmission(application) {
  const definitions = APPLICATION_STEP_DEFINITIONS[application.type];
  const errors = [];

  for (const definition of definitions) {
    const data = getStoredStep(application, definition.key).data;
    const result = definition.schema.safeParse(data);
    if (!result.success) {
      for (const issue of result.error.issues) {
        errors.push({
          field: `${definition.key}.${issue.path.join('.')}`,
          message: issue.message,
        });
      }
    }
  }

  return errors;
}

export async function submitApplication({ applicationId, ownerId, ipAddress }) {
  const application = await findOwnedApplication(applicationId, ownerId);
  if (!EDITABLE_APPLICATION_STATUSES.includes(application.status)) {
    throw new ApiError(409, 'This application cannot be submitted from its current status.');
  }

  const errors = validateApplicationForSubmission(application);
  if (errors.length > 0) {
    throw new ApiError(422, 'Complete every required application field before submitting.', errors);
  }

  application.completionPercentage = 100;
  application.submittedAt = new Date();
  application.currentStep = 'review';
  const isResubmission =
    application.status === APPLICATION_STATUSES.ADDITIONAL_INFORMATION_REQUIRED;
  const isRenewal = application.purpose === APPLICATION_PURPOSES.RENEWAL;
  const nextStatus = isResubmission
    ? APPLICATION_STATUSES.RESUBMITTED
    : environment.applicationPaymentRequired
      ? APPLICATION_STATUSES.PAYMENT_PENDING
      : isRenewal
        ? APPLICATION_STATUSES.RENEWAL_SUBMITTED
        : APPLICATION_STATUSES.SUBMITTED;

  appendApplicationStatusHistory(application, {
    newStatus: nextStatus,
    changedBy: ownerId,
    ipAddress,
    applicantVisibleNote: isResubmission
      ? 'Additional information submitted. The application has returned to the review queue.'
      : environment.applicationPaymentRequired
        ? 'Application details submitted. Payment is required before review.'
        : isRenewal
          ? 'Renewal application submitted successfully and is awaiting review.'
          : 'Application submitted successfully and is awaiting the review workflow.',
  });
  await application.save();

  if (isResubmission) {
    const review = await ApplicationReview.findOneAndUpdate(
      { application: application._id },
      {
        $set: {
          status: 'open',
          requestedSections: [],
          lastActivityAt: new Date(),
        },
      },
      { new: true },
    );
    if (review?.assignedReviewer) {
      await createNotificationSafely({
        recipient: review.assignedReviewer,
        type: NOTIFICATION_TYPES.APPLICATION_UPDATE,
        category: NOTIFICATION_CATEGORIES.APPLICATION,
        title: 'Application resubmitted',
        message: `${application.reference} has been resubmitted with additional information.`,
        actionUrl: `/admin/applications/${application.id}`,
        application: application._id,
        reference: application.reference,
        dedupeKey: `application-resubmitted:${application.id}:${application.statusHistory.at(-1)._id}`,
      });
    }
  }
  await createNotificationSafely({
    recipient: ownerId,
    type: NOTIFICATION_TYPES.APPLICATION_SUBMITTED,
    category: NOTIFICATION_CATEGORIES.APPLICATION,
    title: isResubmission
      ? 'Application resubmitted'
      : isRenewal
        ? 'Renewal application submitted'
        : 'Application submitted',
    message: isResubmission
      ? `${application.reference} was resubmitted and is awaiting review.`
      : environment.applicationPaymentRequired
        ? `${application.reference} was submitted and is awaiting payment.`
        : isRenewal
          ? `${application.reference} renewal was submitted and is awaiting review.`
          : `${application.reference} was submitted and is awaiting review.`,
    actionUrl: !isResubmission && environment.applicationPaymentRequired
      ? '/dashboard/payments'
      : `/dashboard/applications/${application.id}`, 
    application: application._id,
    reference: application.reference,
    dedupeKey: `${isResubmission ? 'application-resubmitted' : 'application-submitted'}:${application.id}:${nextStatus}`, 
  });
  return serializeApplication(application);
}

export async function withdrawApplication({
  applicationId,
  ownerId,
  reason,
  ipAddress,
}) {
  const application = await findOwnedApplication(applicationId, ownerId);
  if (!WITHDRAWABLE_APPLICATION_STATUSES.includes(application.status)) {
    throw new ApiError(409, 'This application cannot be withdrawn from its current status.');
  }

  appendApplicationStatusHistory(application, {
    newStatus: APPLICATION_STATUSES.WITHDRAWN,
    changedBy: ownerId,
    ipAddress,
    reason,
    applicantVisibleNote: reason || 'Application withdrawn by the applicant.',
  });
  application.withdrawnAt = new Date();
  application.isCurrent = false;
  await application.save();
  return serializeApplication(application);
}
