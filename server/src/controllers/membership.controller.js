import {
  createRenewalApplication,
  getMembershipForAdmin,
  getMembershipForOwner,
  getMembershipPolicy,
  issueMembershipForApprovedApplication,
  listMembershipsForAdmin,
  listMembershipsForOwner,
  processMembershipRenewals,
  replaceMembershipCertificate,
  revokeMembershipCertificate,
  updateMembershipPolicy,
  updateMembershipStatus,
} from '../services/membership.service.js';
import {
  createCertificatePdf,
  getCertificateForAccess,
  getPublicCertificateVerification,
} from '../services/certificate.service.js';
import {
  getPublicCourseVerification,
} from '../services/courseCertificate.service.js';
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

export const myMemberships = asyncHandler(async (request, response) => {
  const memberships = await listMembershipsForOwner(request.auth.userId);
  response.status(200).json(new ApiResponse({
    message: 'Membership and accreditation records loaded.',
    data: { memberships },
  }));
});

export const myMembership = asyncHandler(async (request, response) => {
  const membership = await getMembershipForOwner({
    membershipId: request.validated.params.membershipId,
    ownerId: request.auth.userId,
  });
  response.status(200).json(new ApiResponse({
    message: 'Membership record loaded.',
    data: { membership },
  }));
});

export const startRenewal = asyncHandler(async (request, response) => {
  const application = await createRenewalApplication({
    membershipId: request.validated.params.membershipId,
    ownerId: request.auth.userId,
    ipAddress: request.ip,
  });
  response.status(201).json(new ApiResponse({
    message: 'Renewal application created.',
    data: { application },
  }));
});

export const certificatePdf = asyncHandler(async (request, response) => {
  const certificate = await getCertificateForAccess({
    certificateId: request.validated.params.certificateId,
    auth: request.auth,
  });
  const { bytes } = await createCertificatePdf(certificate);
  const disposition = request.query.download === 'true' ? 'attachment' : 'inline';
  response.setHeader('Content-Type', 'application/pdf');
  response.setHeader('Cache-Control', 'private, no-store, max-age=0');
  response.setHeader(
    'Content-Disposition',
    `${disposition}; filename="${certificate.certificateNumber}.pdf"`,
  );
  response.setHeader('Content-Length', bytes.length);
  response.status(200).send(bytes);
});

export const publicVerification = asyncHandler(async (request, response) => {
  const identifier = request.validated.params.identifier;

  let verification = await getPublicCertificateVerification(identifier);

  if (!verification) {
    const courseVerification = await getPublicCourseVerification(identifier);

    if (courseVerification) {
      verification = {
        ...courseVerification,
        recordKind: 'course',
        certificateTitle: 'Course Accreditation Certificate',
        holderName: courseVerification.courseTitle,
        type: 'course',
        typeLabel: 'Accredited Course',
        registrationNumber: courseVerification.accreditationNumber,
        replacementIssued: false,
        verifiedAt: new Date().toISOString(),
      };
    }
  }

  if (!verification) {
    throw new ApiError(
      404,
      'Certificate, registration or course accreditation record not found.',
    );
  }

  response.setHeader('Cache-Control', 'public, max-age=60, must-revalidate');
  response.status(200).json(new ApiResponse({
    message: 'Certificate verification completed.',
    data: { verification },
  }));
});

export const adminPolicy = asyncHandler(async (_request, response) => {
  const policy = await getMembershipPolicy();
  response.status(200).json(new ApiResponse({
    message: policy ? 'Membership policy loaded.' : 'Membership policy is not configured.',
    data: { policy: policy ? policy.toJSON() : null },
  }));
});

export const saveAdminPolicy = asyncHandler(async (request, response) => {
  const policy = await updateMembershipPolicy({
    actor: actorFromRequest(request),
    input: request.validated.body,
    context: contextFromRequest(request),
  });
  response.status(200).json(new ApiResponse({
    message: 'Membership issuance policy saved.',
    data: { policy },
  }));
});

export const adminMemberships = asyncHandler(async (request, response) => {
  const result = await listMembershipsForAdmin({ filters: request.validated.query });
  response.status(200).json(new ApiResponse({
    message: 'Membership administration records loaded.',
    data: {
      memberships: result.memberships,
      unissuedApplications: result.unissuedApplications,
    },
    meta: result.meta,
  }));
});

export const adminMembership = asyncHandler(async (request, response) => {
  const membership = await getMembershipForAdmin(request.validated.params.membershipId);
  response.status(200).json(new ApiResponse({
    message: 'Membership administration record loaded.',
    data: { membership },
  }));
});

export const issueApprovedMembership = asyncHandler(async (request, response) => {
  const membership = await issueMembershipForApprovedApplication({
    applicationId: request.validated.body.applicationId,
    actor: actorFromRequest(request),
    context: contextFromRequest(request),
  });
  response.status(201).json(new ApiResponse({
    message: 'Membership record and certificate issued.',
    data: { membership: membership.toJSON() },
  }));
});

export const changeMembershipStatus = asyncHandler(async (request, response) => {
  const membership = await updateMembershipStatus({
    membershipId: request.validated.params.membershipId,
    actor: actorFromRequest(request),
    input: request.validated.body,
    context: contextFromRequest(request),
  });
  response.status(200).json(new ApiResponse({
    message: 'Membership status updated.',
    data: { membership },
  }));
});

export const revokeCertificate = asyncHandler(async (request, response) => {
  if (request.validated.body.confirmation !== 'REVOKE') {
    throw new ApiError(422, 'Type REVOKE to confirm certificate revocation.');
  }
  const certificate = await revokeMembershipCertificate({
    certificateId: request.validated.params.certificateId,
    actor: actorFromRequest(request),
    reason: request.validated.body.reason,
    context: contextFromRequest(request),
  });
  response.status(200).json(new ApiResponse({
    message: 'Certificate revoked.',
    data: { certificate },
  }));
});

export const replaceCertificate = asyncHandler(async (request, response) => {
  if (request.validated.body.confirmation !== 'REPLACE') {
    throw new ApiError(422, 'Type REPLACE to confirm certificate replacement.');
  }
  const certificate = await replaceMembershipCertificate({
    certificateId: request.validated.params.certificateId,
    actor: actorFromRequest(request),
    reason: request.validated.body.reason,
    context: contextFromRequest(request),
  });
  response.status(201).json(new ApiResponse({
    message: 'Replacement certificate issued.',
    data: { certificate },
  }));
});

export const runRenewalProcessing = asyncHandler(async (_request, response) => {
  const result = await processMembershipRenewals();
  response.status(200).json(new ApiResponse({
    message: 'Membership statuses and renewal reminders processed.',
    data: result,
  }));
});
