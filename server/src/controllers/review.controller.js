import {
  addReviewNote,
  approveApplication,
  assignReviewer,
  bulkAssignReviewer,
  getReviewDashboard,
  getReviewWorkspace,
  listAuditHistory,
  listReviewers,
  listReviewQueue,
  rejectApplication,
  requestAdditionalInformation,
  suspendApplication,
  updatePaymentWaiver,
  updateReviewChecklist,
} from '../services/review.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

function actorFromRequest(request) {
  return {
    userId: request.auth.userId,
    roles: request.auth.roles,
    permissions: request.auth.permissions,
  };
}

function contextFromRequest(request) {
  return {
    ipAddress: request.ip,
    userAgent: request.get('user-agent') || '',
    requestId: request.id || '',
  };
}

export const dashboard = asyncHandler(async (request, response) => {
  const overview = await getReviewDashboard({ actor: actorFromRequest(request) });
  response.status(200).json(new ApiResponse({
    message: 'Administrative review dashboard loaded.',
    data: { overview },
  }));
});

export const queue = asyncHandler(async (request, response) => {
  const result = await listReviewQueue({
    actor: actorFromRequest(request),
    filters: request.validated.query,
  });
  response.status(200).json(new ApiResponse({
    message: 'Application review queue loaded.',
    data: { applications: result.applications },
    meta: result.meta,
  }));
});

export const reviewers = asyncHandler(async (_request, response) => {
  const items = await listReviewers();
  response.status(200).json(new ApiResponse({
    message: 'Reviewer accounts loaded.',
    data: { reviewers: items },
  }));
});

export const workspace = asyncHandler(async (request, response) => {
  const result = await getReviewWorkspace({
    actor: actorFromRequest(request),
    applicationId: request.validated.params.applicationId,
  });
  response.status(200).json(new ApiResponse({
    message: 'Application review workspace loaded.',
    data: { workspace: result },
  }));
});

export const assign = asyncHandler(async (request, response) => {
  const result = await assignReviewer({
    actor: actorFromRequest(request),
    applicationId: request.validated.params.applicationId,
    reviewerId: request.validated.body.reviewerId,
    dueAt: request.validated.body.dueAt,
    context: contextFromRequest(request),
  });
  response.status(200).json(new ApiResponse({
    message: request.validated.body.reviewerId
      ? 'Reviewer assignment saved.'
      : 'Reviewer assignment removed.',
    data: result,
  }));
});

export const assignBulk = asyncHandler(async (request, response) => {
  const result = await bulkAssignReviewer({
    actor: actorFromRequest(request),
    applicationIds: request.validated.body.applicationIds,
    reviewerId: request.validated.body.reviewerId,
    dueAt: request.validated.body.dueAt,
    context: contextFromRequest(request),
  });
  response.status(200).json(new ApiResponse({
    message: `${result.succeeded} assignment(s) updated; ${result.failed} failed.`,
    data: result,
  }));
});

export const note = asyncHandler(async (request, response) => {
  const review = await addReviewNote({
    actor: actorFromRequest(request),
    applicationId: request.validated.params.applicationId,
    input: request.validated.body,
    context: contextFromRequest(request),
  });
  response.status(201).json(new ApiResponse({
    message: 'Review note added.',
    data: { review },
  }));
});

export const checklist = asyncHandler(async (request, response) => {
  const review = await updateReviewChecklist({
    actor: actorFromRequest(request),
    applicationId: request.validated.params.applicationId,
    input: request.validated.body,
    context: contextFromRequest(request),
  });
  response.status(200).json(new ApiResponse({
    message: 'Review checklist updated.',
    data: { review },
  }));
});

export const paymentWaiver = asyncHandler(async (request, response) => {
  const review = await updatePaymentWaiver({
    actor: actorFromRequest(request),
    applicationId: request.validated.params.applicationId,
    input: request.validated.body,
    context: contextFromRequest(request),
  });
  response.status(200).json(new ApiResponse({
    message: request.validated.body.waived
      ? 'Payment requirement waived for review approval.'
      : 'Payment waiver removed.',
    data: { review },
  }));
});

export const requestInformation = asyncHandler(async (request, response) => {
  const result = await requestAdditionalInformation({
    actor: actorFromRequest(request),
    applicationId: request.validated.params.applicationId,
    input: request.validated.body,
    context: contextFromRequest(request),
  });
  response.status(200).json(new ApiResponse({
    message: 'Additional information requested from the applicant.',
    data: { workspace: result },
  }));
});

function decisionHandler(service, message) {
  return asyncHandler(async (request, response) => {
    const result = await service({
      actor: actorFromRequest(request),
      applicationId: request.validated.params.applicationId,
      input: request.validated.body,
      context: contextFromRequest(request),
    });
    response.status(200).json(new ApiResponse({
      message,
      data: { workspace: result },
    }));
  });
}

export const approve = decisionHandler(approveApplication, 'Application approved.');
export const reject = decisionHandler(rejectApplication, 'Application rejected.');
export const suspend = decisionHandler(suspendApplication, 'Application suspended.');

export const audit = asyncHandler(async (request, response) => {
  const result = await listAuditHistory({
    actor: actorFromRequest(request),
    filters: request.validated.query,
  });
  response.status(200).json(new ApiResponse({
    message: 'Administrative audit history loaded.',
    data: { entries: result.entries },
    meta: result.meta,
  }));
});
