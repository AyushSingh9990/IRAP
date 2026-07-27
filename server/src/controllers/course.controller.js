import {
  addCourseReviewNote,
  approveCourse,
  assignCourseReviewer,
  createCourseDraft,
  getAdminCourse,
  getCoursePolicy,
  getSelfCourse,
  listAdminCourses,
  listCourseReviewers,
  listSelfCourses,
  rejectCourse,
  requestCourseInformation,
  submitCourseForReview,
  updateCourseAdministrativeStatus,
  updateCourseChecklist,
  updateCourseDraft,
  updateCoursePolicy,
} from '../services/course.service.js';
import {
  getCourseCertificateForAccess,
  getPublicCourseVerification,
  generateCourseCertificatePdf,
} from '../services/courseCertificate.service.js';
import {
  getCourseDocumentContent,
  listCourseDocuments,
  removeCourseDocument,
  reviewCourseDocument,
  uploadCourseDocument,
} from '../services/courseDocument.service.js';
import { ApiError } from '../utils/ApiError.js';
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

function contentDisposition(filename, disposition) {
  const safeName = String(filename || 'document')
    .replace(/[^\x20-\x7e]/g, '_')
    .replace(/["\\]/g, '_');

  return `${disposition}; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(
    filename,
  )}`;
}

export const myCourses = asyncHandler(async (request, response) => {
  const result = await listSelfCourses({
    ownerId: request.auth.userId,
    filters: request.validated.query,
  });

  response.status(200).json(
    new ApiResponse({
      message: 'Provider courses loaded.',
      data: { courses: result.courses },
      meta: result.meta,
    }),
  );
});

export const createCourse = asyncHandler(async (request, response) => {
  const course = await createCourseDraft({
    ownerId: request.auth.userId,
    input: request.validated.body,
  });

  response.status(201).json(
    new ApiResponse({
      message: 'Course draft created.',
      data: { course },
    }),
  );
});

export const myCourse = asyncHandler(async (request, response) => {
  const course = await getSelfCourse({
    courseId: request.validated.params.courseId,
    ownerId: request.auth.userId,
  });

  response.status(200).json(
    new ApiResponse({
      message: 'Course record loaded.',
      data: { course },
    }),
  );
});

export const saveCourse = asyncHandler(async (request, response) => {
  const course = await updateCourseDraft({
    courseId: request.validated.params.courseId,
    ownerId: request.auth.userId,
    input: request.validated.body,
  });

  response.status(200).json(
    new ApiResponse({
      message: 'Course draft saved.',
      data: { course },
    }),
  );
});

export const submitCourse = asyncHandler(async (request, response) => {
  const course = await submitCourseForReview({
    courseId: request.validated.params.courseId,
    ownerId: request.auth.userId,
  });

  response.status(200).json(
    new ApiResponse({
      message: 'Course submitted for accreditation review.',
      data: { course },
    }),
  );
});

export const courseDocuments = asyncHandler(async (request, response) => {
  const documents = await listCourseDocuments({
    courseId: request.validated.params.courseId,
    auth: request.auth,
    includeHistory: request.validated.query.includeHistory,
  });

  response.status(200).json(
    new ApiResponse({
      message: 'Course evidence loaded.',
      data: { documents },
    }),
  );
});

export const uploadDocument = asyncHandler(async (request, response) => {
  const document = await uploadCourseDocument({
    courseId: request.validated.params.courseId,
    ownerId: request.auth.userId,
    file: request.file,
    input: request.validated.body,
  });

  response.status(201).json(
    new ApiResponse({
      message: 'Course evidence uploaded securely.',
      data: { document },
    }),
  );
});

export const removeDocument = asyncHandler(async (request, response) => {
  await removeCourseDocument({
    documentId: request.validated.params.documentId,
    ownerId: request.auth.userId,
  });

  response.status(200).json(
    new ApiResponse({
      message: 'Draft course evidence removed.',
      data: null,
    }),
  );
});

export const documentContent = asyncHandler(
  async (request, response, next) => {
    const { document, asset } = await getCourseDocumentContent({
      documentId: request.validated.params.documentId,
      auth: request.auth,
    });

    response.setHeader('Content-Type', document.mimeType);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader(
      'Cache-Control',
      'private, no-store, max-age=0',
    );
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
  },
);

export const adminPolicy = asyncHandler(async (_request, response) => {
  const policy = await getCoursePolicy();

  response.status(200).json(
    new ApiResponse({
      message: policy
        ? 'Course accreditation policy loaded.'
        : 'Course accreditation policy is not configured.',
      data: { policy },
    }),
  );
});

export const saveAdminPolicy = asyncHandler(
  async (request, response) => {
    const policy = await updateCoursePolicy({
      actor: actorFromRequest(request),
      input: request.validated.body,
      context: contextFromRequest(request),
    });

    response.status(200).json(
      new ApiResponse({
        message: 'Course accreditation policy saved.',
        data: { policy },
      }),
    );
  },
);

export const adminReviewers = asyncHandler(async (_request, response) => {
  const reviewers = await listCourseReviewers();

  response.status(200).json(
    new ApiResponse({
      message: 'Course reviewers loaded.',
      data: { reviewers },
    }),
  );
});

export const adminQueue = asyncHandler(async (request, response) => {
  const result = await listAdminCourses({
    filters: request.validated.query,
    actor: actorFromRequest(request),
  });

  response.status(200).json(
    new ApiResponse({
      message: 'Course accreditation queue loaded.',
      data: { courses: result.courses },
      meta: result.meta,
    }),
  );
});

export const adminCourse = asyncHandler(async (request, response) => {
  const result = await getAdminCourse(
    request.validated.params.courseId,
  );

  const documents = await listCourseDocuments({
    courseId: request.validated.params.courseId,
    auth: request.auth,
    includeHistory: true,
  });

  response.status(200).json(
    new ApiResponse({
      message: 'Course accreditation workspace loaded.',
      data: {
        workspace: {
          ...result.serialized,
          owner: {
            id: result.course.owner.id,
            displayName: result.course.owner.displayName,
            email: result.course.owner.email,
          },
          documents,
        },
      },
    }),
  );
});

export const assignReviewer = asyncHandler(async (request, response) => {
  const course = await assignCourseReviewer({
    courseId: request.validated.params.courseId,
    actor: actorFromRequest(request),
    input: request.validated.body,
    context: contextFromRequest(request),
  });

  response.status(200).json(
    new ApiResponse({
      message: request.validated.body.reviewerId
        ? 'Course reviewer assigned.'
        : 'Course reviewer removed.',
      data: { course },
    }),
  );
});

export const saveChecklist = asyncHandler(async (request, response) => {
  const review = await updateCourseChecklist({
    courseId: request.validated.params.courseId,
    actor: actorFromRequest(request),
    input: request.validated.body,
    context: contextFromRequest(request),
  });

  response.status(200).json(
    new ApiResponse({
      message: 'Course review checklist saved.',
      data: { review },
    }),
  );
});

export const addReviewNote = asyncHandler(async (request, response) => {
  const review = await addCourseReviewNote({
    courseId: request.validated.params.courseId,
    actor: actorFromRequest(request),
    input: request.validated.body,
    context: contextFromRequest(request),
  });

  response.status(201).json(
    new ApiResponse({
      message: 'Course review note added.',
      data: { review },
    }),
  );
});

export const requestInformation = asyncHandler(
  async (request, response) => {
    const course = await requestCourseInformation({
      courseId: request.validated.params.courseId,
      actor: actorFromRequest(request),
      input: request.validated.body,
      context: contextFromRequest(request),
    });

    response.status(200).json(
      new ApiResponse({
        message: 'Additional course information requested.',
        data: { course },
      }),
    );
  },
);

export const approve = asyncHandler(async (request, response) => {
  const result = await approveCourse({
    courseId: request.validated.params.courseId,
    actor: actorFromRequest(request),
    input: request.validated.body,
    context: contextFromRequest(request),
  });

  response.status(200).json(
    new ApiResponse({
      message:
        'Course approved, certificate issued, and directory record synchronized.',
      data: { workspace: result.serialized },
    }),
  );
});

export const reject = asyncHandler(async (request, response) => {
  const course = await rejectCourse({
    courseId: request.validated.params.courseId,
    actor: actorFromRequest(request),
    input: request.validated.body,
    context: contextFromRequest(request),
  });

  response.status(200).json(
    new ApiResponse({
      message: 'Course accreditation rejected.',
      data: { course },
    }),
  );
});

export const reviewDocument = asyncHandler(async (request, response) => {
  const document = await reviewCourseDocument({
    documentId: request.validated.params.documentId,
    actor: actorFromRequest(request),
    input: request.validated.body,
    context: contextFromRequest(request),
  });

  response.status(200).json(
    new ApiResponse({
      message: 'Course-document review saved.',
      data: { document },
    }),
  );
});

export const changeStatus = asyncHandler(async (request, response) => {
  const course = await updateCourseAdministrativeStatus({
    courseId: request.validated.params.courseId,
    actor: actorFromRequest(request),
    input: request.validated.body,
    context: contextFromRequest(request),
  });

  response.status(200).json(
    new ApiResponse({
      message: 'Course accreditation status updated.',
      data: { course },
    }),
  );
});

export const certificatePdf = asyncHandler(async (request, response) => {
  const certificate = await getCourseCertificateForAccess({
    certificateId: request.validated.params.certificateId,
    auth: request.auth,
  });

  const { bytes } = await generateCourseCertificatePdf(certificate);
  const disposition = request.validated.query.download
    ? 'attachment'
    : 'inline';

  response.setHeader('Content-Type', 'application/pdf');
  response.setHeader(
    'Cache-Control',
    'private, no-store, max-age=0',
  );
  response.setHeader(
    'Content-Disposition',
    `${disposition}; filename="${certificate.certificateNumber}.pdf"`,
  );
  response.setHeader('Content-Length', bytes.length);
  response.status(200).send(bytes);
});

export const publicVerification = asyncHandler(
  async (request, response) => {
    const verification = await getPublicCourseVerification(
      request.validated.params.identifier,
    );

    if (!verification) {
      throw new ApiError(
        404,
        'Course accreditation certificate not found.',
      );
    }

    response.setHeader(
      'Cache-Control',
      'public, max-age=60, must-revalidate',
    );

    response.status(200).json(
      new ApiResponse({
        message: 'Course certificate verification completed.',
        data: { verification },
      }),
    );
  },
);
