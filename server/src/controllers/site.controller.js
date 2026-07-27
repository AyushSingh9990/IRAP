import {
  getPublicSiteConfiguration,
  getPublishedContentPage,
} from '../services/siteContent.service.js';
import {
  createComplaint,
  createContactSubmission,
} from '../services/support.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

function contextFromRequest(request) {
  return {
    ipAddress: request.ip,
    userAgent: request.get('user-agent') || '',
    requestId: request.id || '',
  };
}

export const publicConfiguration = asyncHandler(async (_request, response) => {
  const configuration = await getPublicSiteConfiguration();
  response.status(200).json(
    new ApiResponse({
      message: 'Public site configuration loaded.',
      data: { configuration },
    }),
  );
});

export const publicContentPage = asyncHandler(async (request, response) => {
  const page = await getPublishedContentPage(request.validated.params.slug);
  response.status(200).json(
    new ApiResponse({
      message: page ? 'Published content page loaded.' : 'No published content page is configured.',
      data: { page },
    }),
  );
});

export const submitContact = asyncHandler(async (request, response) => {
  const submission = await createContactSubmission({
    input: request.validated.body,
    context: contextFromRequest(request),
  });
  response.status(201).json(
    new ApiResponse({
      message: 'Your enquiry was submitted securely.',
      data: { submission },
    }),
  );
});

export const submitComplaint = asyncHandler(async (request, response) => {
  const complaint = await createComplaint({
    input: request.validated.body,
    context: contextFromRequest(request),
  });
  response.status(201).json(
    new ApiResponse({
      message: 'Your complaint was submitted securely.',
      data: { complaint },
    }),
  );
});
