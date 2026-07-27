import crypto from 'node:crypto';
import { customAlphabet } from 'nanoid';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import QRCode from 'qrcode';
import { environment } from '../config/environment.js';
import {
  COURSE_CERTIFICATE_STATUSES,
  COURSE_STATUSES,
} from '../constants/courseConstants.js';
import {
  MEMBERSHIP_STATUSES,
} from '../constants/membershipConstants.js';
import { PERMISSIONS } from '../constants/permissions.js';
import Course from '../models/Course.js';
import CourseCertificate from '../models/CourseCertificate.js';
import Membership from '../models/Membership.js';
import { ApiError } from '../utils/ApiError.js';
import { generateSequentialRegistryNumber } from './registryNumber.service.js';
import { getActiveCertificateTemplate } from './siteContent.service.js';

const verificationCodeGenerator = customAlphabet(
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789',
  32,
);

function publicBaseUrl() {
  return environment.clientUrls[0].replace(/\/$/, '');
}

function addMonthsUtc(date, months) {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

export async function createCourseCertificate({
  course,
  providerMembership,
  policy,
  issuedBy,
  session = null,
}) {
  const issueDate = new Date();
  const expiryDate = addMonthsUtc(issueDate, policy.validityMonths);

  const accreditationNumber =
    course.accreditationNumber ||
    (await generateSequentialRegistryNumber({
      category: 'course_accreditation',
      prefix: policy.accreditationPrefix,
    }));

  const certificateNumber = await generateSequentialRegistryNumber({
    category: 'course_certificate',
    prefix: policy.certificatePrefix,
  });

  const verificationCode = verificationCodeGenerator();
  const verificationUrl = `${publicBaseUrl()}/verify/course/${verificationCode}`;

  const [certificate] = await CourseCertificate.create(
    [
      {
        course: course._id,
        owner: course.owner,
        providerMembership: providerMembership._id,
        certificateNumber,
        accreditationNumber,
        verificationCode,
        verificationUrl,
        courseTitle: course.title,
        providerName: providerMembership.approvedName,
        creditHours: course.creditHours,
        creditUnit: course.creditUnit,
        issueDate,
        expiryDate,
        status: COURSE_CERTIFICATE_STATUSES.ACTIVE,
        authorizedSignatory: {
          name: policy.authorizedSignatory.name,
          title: policy.authorizedSignatory.title,
        },
        statusHistory: [
          {
            previousStatus: null,
            newStatus: COURSE_CERTIFICATE_STATUSES.ACTIVE,
            changedBy: issuedBy,
            reason: 'Course accreditation certificate issued.',
          },
        ],
      },
    ],
    session ? { session } : undefined,
  );

  return {
    certificate,
    accreditationNumber,
    issueDate,
    expiryDate,
  };
}

function publicStatus(certificate, course, providerMembership) {
  if (!certificate || !course || !providerMembership) return 'not_found';

  if (
    certificate.status === COURSE_CERTIFICATE_STATUSES.REVOKED ||
    course.status === COURSE_STATUSES.REVOKED ||
    providerMembership.status === MEMBERSHIP_STATUSES.REVOKED
  ) {
    return 'revoked';
  }

  if (
    certificate.status === COURSE_CERTIFICATE_STATUSES.SUSPENDED ||
    course.status === COURSE_STATUSES.SUSPENDED ||
    providerMembership.status === MEMBERSHIP_STATUSES.SUSPENDED
  ) {
    return 'suspended';
  }

  if (
    certificate.status === COURSE_CERTIFICATE_STATUSES.REPLACED ||
    certificate.status === COURSE_CERTIFICATE_STATUSES.EXPIRED ||
    course.status === COURSE_STATUSES.EXPIRED ||
    providerMembership.status === MEMBERSHIP_STATUSES.EXPIRED ||
    certificate.expiryDate.getTime() < Date.now() ||
    providerMembership.validUntil.getTime() < Date.now()
  ) {
    return 'expired';
  }

  return 'valid';
}

function escapeRegularExpression(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function publicIdentifierCandidates(identifier) {
  const decoded = (() => {
    try {
      return decodeURIComponent(String(identifier || ''));
    } catch {
      return String(identifier || '');
    }
  })();

  const cleaned = decoded
    .replace(/[‐‑‒–—−]/g, '-')
    .replace(/\u00a0/g, ' ')
    .trim();

  const compact = cleaned.replace(/\s+/g, '');
  const spacedHyphensRemoved = cleaned.replace(/\s*-\s*/g, '-');

  return [...new Set([cleaned, compact, spacedHyphensRemoved].filter(Boolean))];
}

async function populateCourseCertificate(query) {
  return query
    .sort({ issueDate: -1 })
    .populate(
      'course',
      'title status category deliveryMethods language creditHours creditUnit validFrom validUntil publicVisible accreditationNumber currentCertificate',
    )
    .populate(
      'providerMembership',
      'approvedName status validUntil registrationNumber',
    );
}

async function locateCourseCertificate(identifier) {
  const candidates = publicIdentifierCandidates(identifier);
  if (!candidates.length) return null;

  const exactValues = candidates.flatMap((value) => [value, value.toUpperCase()]);

  let certificate = await populateCourseCertificate(
    CourseCertificate.findOne({
      $or: [
        { verificationCode: { $in: exactValues } },
        { certificateNumber: { $in: exactValues } },
        { accreditationNumber: { $in: exactValues } },
      ],
    }),
  );

  if (!certificate) {
    const expressions = candidates.map(
      (value) => new RegExp(`^${escapeRegularExpression(value)}$`, 'i'),
    );

    certificate = await populateCourseCertificate(
      CourseCertificate.findOne({
        $or: [
          { verificationCode: { $in: expressions } },
          { certificateNumber: { $in: expressions } },
          { accreditationNumber: { $in: expressions } },
        ],
      }),
    );
  }

  if (certificate) return certificate;

  const expressions = candidates.map(
    (value) => new RegExp(`^${escapeRegularExpression(value)}$`, 'i'),
  );

  const course = await Course.findOne({
    accreditationNumber: { $in: expressions },
  }).select(
    'title status category deliveryMethods language creditHours creditUnit validFrom validUntil publicVisible accreditationNumber currentCertificate providerMembership',
  );

  if (!course) return null;

  certificate = course.currentCertificate
    ? await populateCourseCertificate(
        CourseCertificate.findById(course.currentCertificate),
      )
    : null;

  if (!certificate) {
    certificate = await populateCourseCertificate(
      CourseCertificate.findOne({ course: course._id }),
    );
  }

  return certificate;
}

export async function getPublicCourseVerification(identifier) {
  const certificate = await locateCourseCertificate(identifier);
  if (!certificate) return null;

  const course = certificate.course || null;
  let providerMembership = certificate.providerMembership || null;

  if (!providerMembership && certificate.providerMembership) {
    providerMembership = await Membership.findById(
      certificate.providerMembership,
    ).select('approvedName status validUntil registrationNumber');
  }

  const fallbackCourse = course || {
    title: certificate.courseTitle,
    status: COURSE_STATUSES.APPROVED,
    category: 'Not available',
    deliveryMethods: [],
    language: 'Not available',
  };

  const fallbackProvider = providerMembership || {
    approvedName: certificate.providerName,
    registrationNumber: 'Not available',
    status: MEMBERSHIP_STATUSES.ACTIVE,
    validUntil: certificate.expiryDate,
  };

  return {
    recordKind: 'course',
    status: publicStatus(certificate, fallbackCourse, fallbackProvider),
    certificateNumber: certificate.certificateNumber,
    accreditationNumber: certificate.accreditationNumber,
    courseTitle: certificate.courseTitle || course?.title,
    providerName: certificate.providerName || providerMembership?.approvedName,
    providerRegistrationNumber:
      providerMembership?.registrationNumber || 'Not available',
    category: course?.category || 'Not available',
    deliveryMethods: course?.deliveryMethods || [],
    language: course?.language || 'Not available',
    creditHours: certificate.creditHours,
    creditUnit: certificate.creditUnit,
    issueDate: certificate.issueDate,
    expiryDate: certificate.expiryDate,
    verificationCode: certificate.verificationCode,
    verifiedAt: new Date().toISOString(),
  };
}


function hexToRgbColor(value, fallback) {
  const match = /^#([0-9a-f]{6})$/i.exec(String(value || ''));
  if (!match) return fallback;
  const number = Number.parseInt(match[1], 16);
  return rgb(
    ((number >> 16) & 255) / 255,
    ((number >> 8) & 255) / 255,
    (number & 255) / 255,
  );
}

function fitText(font, text, maximumWidth, initialSize, minimumSize = 8) {
  let size = initialSize;

  while (size > minimumSize && font.widthOfTextAtSize(text, size) > maximumWidth) {
    size -= 0.5;
  }

  return size;
}

function drawCentered(page, font, text, y, size, color, width) {
  const textWidth = font.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x: (width - textWidth) / 2,
    y,
    size,
    font,
    color,
  });
}

export async function generateCourseCertificatePdf(certificate) {
  const template = await getActiveCertificateTemplate('course').catch(() => null);
  const pdfDocument = await PDFDocument.create();
  const page = pdfDocument.addPage([842, 595]);
  const { width, height } = page.getSize();

  const regular = await pdfDocument.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDocument.embedFont(StandardFonts.HelveticaBold);
  const navy = hexToRgbColor(template?.accentHex, rgb(0.04, 0.18, 0.24));
  const muted = rgb(0.35, 0.4, 0.48);
  const gold = rgb(0.93, 0.66, 0.18);

  page.drawRectangle({
    x: 24,
    y: 24,
    width: width - 48,
    height: height - 48,
    borderColor: navy,
    borderWidth: 2,
  });

  page.drawRectangle({
    x: 36,
    y: 36,
    width: width - 72,
    height: height - 72,
    borderColor: gold,
    borderWidth: 1,
  });

  drawCentered(
    page,
    bold,
    template?.heading || 'iRAP COURSE ACCREDITATION',
    height - 88,
    22,
    navy,
    width,
  );

  drawCentered(
    page,
    regular,
    template?.confirmationText || 'Certificate of Course Accreditation',
    height - 122,
    15,
    muted,
    width,
  );

  const titleSize = fitText(
    bold,
    certificate.courseTitle,
    width - 180,
    28,
    14,
  );

  drawCentered(
    page,
    bold,
    certificate.courseTitle,
    height - 190,
    titleSize,
    navy,
    width,
  );

  drawCentered(
    page,
    regular,
    `Accredited provider: ${certificate.providerName}`,
    height - 225,
    13,
    muted,
    width,
  );

  drawCentered(
    page,
    bold,
    `${certificate.creditHours} ${certificate.creditUnit} hours`,
    height - 260,
    14,
    navy,
    width,
  );

  const details = [
    ['Accreditation number', certificate.accreditationNumber],
    ['Certificate number', certificate.certificateNumber],
    [
      'Issue date',
      new Date(certificate.issueDate).toLocaleDateString('en-GB', {
        timeZone: 'UTC',
      }),
    ],
    [
      'Expiry date',
      new Date(certificate.expiryDate).toLocaleDateString('en-GB', {
        timeZone: 'UTC',
      }),
    ],
  ];

  let detailY = height - 320;

  for (const [label, value] of details) {
    page.drawText(`${label}:`, {
      x: 96,
      y: detailY,
      size: 10,
      font: bold,
      color: navy,
    });
    page.drawText(String(value), {
      x: 230,
      y: detailY,
      size: 10,
      font: regular,
      color: muted,
    });
    detailY -= 24;
  }

  const qrBuffer = await QRCode.toBuffer(certificate.verificationUrl, {
    type: 'png',
    width: 360,
    margin: 1,
    errorCorrectionLevel: 'M',
  });
  const qrImage = await pdfDocument.embedPng(qrBuffer);

  page.drawImage(qrImage, {
    x: width - 210,
    y: 92,
    width: 112,
    height: 112,
  });

  page.drawText('Scan to verify', {
    x: width - 188,
    y: 78,
    size: 9,
    font: bold,
    color: navy,
  });

  page.drawLine({
    start: { x: 96, y: 112 },
    end: { x: 310, y: 112 },
    thickness: 1,
    color: navy,
  });

  const signatoryName = template?.signatoryName || certificate.authorizedSignatory.name;
  const signatoryTitle = template?.signatoryTitle || certificate.authorizedSignatory.title;

  page.drawText(signatoryName, {
    x: 96,
    y: 92,
    size: 11,
    font: bold,
    color: navy,
  });

  page.drawText(signatoryTitle, {
    x: 96,
    y: 76,
    size: 9,
    font: regular,
    color: muted,
  });

  const verificationText = String(certificate.verificationUrl);
  drawCentered(
    page,
    regular,
    verificationText,
    48,
    fitText(regular, verificationText, width - 210, 7, 5),
    muted,
    width,
  );

  if (template?.footerText) {
    drawCentered(
      page,
      regular,
      template.footerText,
      32,
      fitText(regular, template.footerText, width - 210, 7, 5),
      muted,
      width,
    );
  }

  const bytes = Buffer.from(await pdfDocument.save());

  return {
    bytes,
    sha256: crypto
      .createHash('sha256')
      .update(bytes)
      .digest('hex'),
  };
}

export async function getCourseCertificateForAccess({
  certificateId,
  auth,
}) {
  const canManage =
    auth.permissions.includes(PERMISSIONS.COURSE_DECIDE) ||
    auth.permissions.includes(PERMISSIONS.SYSTEM_MANAGE);

  const query = { _id: certificateId };

  if (!canManage) query.owner = auth.userId;

  const certificate = await CourseCertificate.findOne(query);

  if (!certificate) {
    throw new ApiError(404, 'Course certificate not found.');
  }

  return certificate;
}

export async function synchronizeCourseCertificate({
  course,
  actorId,
  status,
  reason,
}) {
  if (!course.currentCertificate) return null;

  const certificate = await CourseCertificate.findById(
    course.currentCertificate,
  );

  if (!certificate) return null;

  const previousStatus = certificate.status;

  if (previousStatus === status) return certificate;

  certificate.status = status;
  certificate.statusHistory.push({
    previousStatus,
    newStatus: status,
    changedBy: actorId,
    reason,
  });

  if (status === COURSE_CERTIFICATE_STATUSES.REVOKED) {
    certificate.revokedAt = new Date();
    certificate.revokedBy = actorId;
    certificate.revocationReason = reason;
  }

  await certificate.save();
  return certificate;
}

export async function providerMembershipForCertificate(certificate) {
  return Membership.findById(certificate.providerMembership);
}
