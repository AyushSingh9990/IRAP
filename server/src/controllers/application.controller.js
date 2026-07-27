import {
  createApplicationDraft,
  getApplicationForUser,
  listApplicationsForUser,
  saveApplicationStep,
  submitApplication,
  withdrawApplication,
} from '../services/application.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listApplications = asyncHandler(async (request, response) => {
  const applications = await listApplicationsForUser(request.auth.userId);
  response.status(200).json(
    new ApiResponse({
      message: 'Applications loaded successfully.',
      data: { applications },
    }),
  );
});

export const createApplication = asyncHandler(async (request, response) => {
  const application = await createApplicationDraft({
    ownerId: request.auth.userId,
    type: request.validated.body.type,
    ipAddress: request.ip,
  });
  response.status(201).json(
    new ApiResponse({
      message: 'Application draft is ready.',
      data: { application },
    }),
  );
});

export const getApplication = asyncHandler(async (request, response) => {
  const application = await getApplicationForUser(
    request.validated.params.applicationId,
    request.auth.userId,
  );
  response.status(200).json(
    new ApiResponse({
      message: 'Application loaded successfully.',
      data: { application },
    }),
  );
});

export const saveStep = asyncHandler(async (request, response) => {
  const result = await saveApplicationStep({
    applicationId: request.validated.params.applicationId,
    ownerId: request.auth.userId,
    stepKey: request.validated.params.stepKey,
    data: request.validated.body.data,
    nextStepKey: request.validated.body.nextStepKey,
  });
  response.status(200).json(
    new ApiResponse({
      message: result.stepComplete
        ? 'Application step saved and completed.'
        : 'Application progress saved. Some required fields still need attention.',
      data: result,
    }),
  );
});

export const submit = asyncHandler(async (request, response) => {
  const application = await submitApplication({
    applicationId: request.validated.params.applicationId,
    ownerId: request.auth.userId,
    ipAddress: request.ip,
  });
  response.status(200).json(
    new ApiResponse({
      message: 'Application submitted successfully.',
      data: { application },
    }),
  );
});

export const withdraw = asyncHandler(async (request, response) => {
  const application = await withdrawApplication({
    applicationId: request.validated.params.applicationId,
    ownerId: request.auth.userId,
    reason: request.validated.body.reason,
    ipAddress: request.ip,
  });
  response.status(200).json(
    new ApiResponse({
      message: 'Application withdrawn successfully.',
      data: { application },
    }),
  );
});
