import {
  getDocumentContent,
  getDocumentForAccess,
  listDocumentsForOwner,
  listDocumentsForReview,
  removeDraftDocument,
  replaceDocument,
  reviewDocument,
  uploadDocument,
} from '../services/document.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

function contentDisposition(filename, disposition) {
  const asciiName = filename.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return `${disposition}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export const listMyDocuments = asyncHandler(async (request, response) => {
  const documents = await listDocumentsForOwner({
    ownerId: request.auth.userId,
    applicationId: request.validated.query.applicationId,
    includeHistory: request.validated.query.includeHistory === 'true',
  });

  response.status(200).json(
    new ApiResponse({
      message: 'Documents loaded successfully.',
      data: { documents },
    }),
  );
});

export const uploadMyDocument = asyncHandler(async (request, response) => {
  const document = await uploadDocument({
    ownerId: request.auth.userId,
    file: request.file,
    input: request.validated.body,
  });

  response.status(201).json(
    new ApiResponse({
      message: 'Document uploaded securely.',
      data: { document },
    }),
  );
});

export const replaceMyDocument = asyncHandler(async (request, response) => {
  const document = await replaceDocument({
    documentId: request.validated.params.documentId,
    ownerId: request.auth.userId,
    file: request.file,
    input: request.validated.body,
  });

  response.status(201).json(
    new ApiResponse({
      message: 'Replacement document uploaded securely.',
      data: { document },
    }),
  );
});

export const removeMyDocument = asyncHandler(async (request, response) => {
  await removeDraftDocument({
    documentId: request.validated.params.documentId,
    ownerId: request.auth.userId,
  });

  response.status(200).json(
    new ApiResponse({
      message: 'Draft document removed.',
      data: null,
    }),
  );
});

export const getDocumentMetadata = asyncHandler(async (request, response) => {
  const result = await getDocumentForAccess({
    documentId: request.validated.params.documentId,
    auth: request.auth,
  });

  response.status(200).json(
    new ApiResponse({
      message: 'Document loaded successfully.',
      data: { document: result.serialized },
    }),
  );
});

export const streamDocument = asyncHandler(async (request, response, next) => {
  const { document, asset } = await getDocumentContent({
    documentId: request.validated.params.documentId,
    auth: request.auth,
  });

  response.setHeader('Content-Type', document.mimeType);
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Cache-Control', 'private, no-store, max-age=0');
  response.setHeader(
    'Content-Disposition',
    contentDisposition(
      document.originalFilename,
      request.validated.query.disposition,
    ),
  );
  if (asset.contentLength) {
    response.setHeader('Content-Length', asset.contentLength);
  }

  asset.stream.on('error', next);
  asset.stream.pipe(response);
});

export const listReviewQueue = asyncHandler(async (request, response) => {
  const result = await listDocumentsForReview({ filters: request.validated.query });
  response.status(200).json(
    new ApiResponse({
      message: 'Document review queue loaded successfully.',
      data: { documents: result.documents },
      meta: result.meta,
    }),
  );
});

export const submitDocumentReview = asyncHandler(async (request, response) => {
  const document = await reviewDocument({
    documentId: request.validated.params.documentId,
    reviewerId: request.auth.userId,
    input: request.validated.body,
  });

  response.status(200).json(
    new ApiResponse({
      message: 'Document review saved.',
      data: { document },
    }),
  );
});
