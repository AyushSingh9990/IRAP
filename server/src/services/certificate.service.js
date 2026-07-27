import crypto from 'node:crypto';
import { customAlphabet } from 'nanoid';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import QRCode from 'qrcode';
import { environment } from '../config/environment.js';
import {
  CERTIFICATE_STATUSES,
  CERTIFICATE_TITLES,
  MEMBERSHIP_STATUSES,
  MEMBERSHIP_TYPE_LABELS,
} from '../constants/membershipConstants.js';
import Certificate from '../models/Certificate.js';
import Membership from '../models/Membership.js';
import { ApiError } from '../utils/ApiError.js';
import { generateSequentialRegistryNumber } from './registryNumber.service.js';
import { getActiveCertificateTemplate } from './siteContent.service.js';

const verificationCodeGenerator = customAlphabet(
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789',
  32,
);

function asObject(value) {
  if (!value) return {};
  if (value instanceof Map) return Object.fromEntries(value);
  return value;
}

function stepData(application, stepKey) {
  const steps = asObject(application?.steps);
  const step = steps[stepKey];
  return asObject(step?.data);
}

function cleanName(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export function resolveApprovedCertificateName(application, user = null) {
  if (!application) throw new ApiError(422, 'Approved application data is required.');

  let name = '';
  if (application.type === 'member') {
    const identity = stepData(application, 'identity');
    name = cleanName(
      identity.displayName ||
        [identity.legalFirstName, identity.legalMiddleName, identity.legalLastName]
          .filter(Boolean)
          .join(' '),
    );
  } else if (application.type === 'training_provider') {
    const business = stepData(application, 'business');
    name = cleanName(business.legalBusinessName || business.tradingName);
  } else if (application.type === 'organization') {
    const identity = stepData(application, 'identity');
    name = cleanName(identity.legalOrganizationName || identity.tradingName);
  }

  const fallback = cleanName(
    user?.displayName || [user?.firstName, user?.lastName].filter(Boolean).join(' '),
  );
  const approvedName = name || fallback;

  if (approvedName.length < 2) {
    throw new ApiError(
      422,
      'The approved application does not contain a valid certificate name.',
      [{ field: 'certificateName', message: 'Review the approved legal or display name.' }],
    );
  }

  return approvedName.slice(0, 240);
}

export function resolveDirectoryConsent(application) {
  const declarations = stepData(application, 'declarations');
  return declarations.directoryConsent === true;
}

function publicVerificationBaseUrl() {
  const preferredClient = environment.clientUrls[0];
  return preferredClient.replace(/\/$/, '');
}

export async function createCertificateRecord({
  membership,
  application,
  policy,
  issuedBy,
  replaces = null,
  reason = '',
}) {
  if (!membership || !application || !policy) {
    throw new ApiError(422, 'Membership, application and certificate policy are required.');
  }

  const title = CERTIFICATE_TITLES[membership.type];
  if (!title) throw new ApiError(422, 'The certificate type is not supported.');

  const certificateNumber = await generateSequentialRegistryNumber({
    category: 'certificate',
    prefix: policy.certificatePrefix,
  });
  const verificationCode = verificationCodeGenerator();
  const verificationUrl = `${publicVerificationBaseUrl()}/verify/certificate/${verificationCode}`;

  const certificate = await Certificate.create({
    membership: membership._id,
    owner: membership.owner,
    application: application._id,
    certificateNumber,
    registrationNumber: membership.registrationNumber,
    verificationCode,
    verificationUrl,
    type: membership.type,
    certificateTitle: title,
    holderName: membership.approvedName,
    issueDate: membership.validFrom,
    expiryDate: membership.validUntil,
    status: CERTIFICATE_STATUSES.ACTIVE,
    authorizedSignatory: {
      name: policy.authorizedSignatory.name,
      title: policy.authorizedSignatory.title,
    },
    replaces,
    statusHistory: [
      {
        previousStatus: null,
        newStatus: CERTIFICATE_STATUSES.ACTIVE,
        changedBy: issuedBy,
        reason: reason || 'Certificate issued from an approved record.',
      },
    ],
  });

  if (replaces) {
    const previousCertificate = await Certificate.findOne({
      _id: replaces,
      status: { $ne: CERTIFICATE_STATUSES.REVOKED },
    });
    if (previousCertificate) {
      const previousStatus = previousCertificate.status;
      previousCertificate.status = CERTIFICATE_STATUSES.REPLACED;
      previousCertificate.replacedBy = certificate._id;
      previousCertificate.statusHistory.push({
        previousStatus,
        newStatus: CERTIFICATE_STATUSES.REPLACED,
        changedBy: issuedBy,
        reason: reason || 'Certificate replaced.',
      });
      await previousCertificate.save();
    }
  }

  return certificate;
}

function certificatePublicStatus(certificate, membership, now = new Date()) {
  if (!certificate || !membership) return 'not_found';
  if (
    certificate.status === CERTIFICATE_STATUSES.REVOKED ||
    membership.status === MEMBERSHIP_STATUSES.REVOKED
  ) {
    return 'revoked';
  }
  if (
    certificate.status === CERTIFICATE_STATUSES.SUSPENDED ||
    membership.status === MEMBERSHIP_STATUSES.SUSPENDED
  ) {
    return 'suspended';
  }
  if (
    certificate.status === CERTIFICATE_STATUSES.REPLACED ||
    certificate.expiryDate.getTime() < now.getTime() ||
    [MEMBERSHIP_STATUSES.EXPIRED, MEMBERSHIP_STATUSES.GRACE_PERIOD].includes(
      membership.status,
    )
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

async function locateMembershipCertificate(identifier) {
  const candidates = publicIdentifierCandidates(identifier);
  if (!candidates.length) return null;

  const exactValues = candidates.flatMap((value) => [value, value.toUpperCase()]);

  let certificate = await Certificate.findOne({
    $or: [
      { verificationCode: { $in: exactValues } },
      { certificateNumber: { $in: exactValues } },
      { registrationNumber: { $in: exactValues } },
    ],
  })
    .sort({ issueDate: -1 })
    .populate(
      'membership',
      'status validFrom validUntil registrationNumber directoryVisible approvedName type currentCertificate',
    );

  if (!certificate) {
    const expressions = candidates.map(
      (value) => new RegExp(`^${escapeRegularExpression(value)}$`, 'i'),
    );

    certificate = await Certificate.findOne({
      $or: [
        { verificationCode: { $in: expressions } },
        { certificateNumber: { $in: expressions } },
        { registrationNumber: { $in: expressions } },
      ],
    })
      .sort({ issueDate: -1 })
      .populate(
        'membership',
        'status validFrom validUntil registrationNumber directoryVisible approvedName type currentCertificate',
      );
  }

  if (certificate) return certificate;

  const membershipExpressions = candidates.map(
    (value) => new RegExp(`^${escapeRegularExpression(value)}$`, 'i'),
  );

  const membership = await Membership.findOne({
    registrationNumber: { $in: membershipExpressions },
  }).select(
    'status validFrom validUntil registrationNumber directoryVisible approvedName type currentCertificate',
  );

  if (!membership) return null;

  certificate = membership.currentCertificate
    ? await Certificate.findById(membership.currentCertificate).populate(
        'membership',
        'status validFrom validUntil registrationNumber directoryVisible approvedName type currentCertificate',
      )
    : null;

  if (!certificate) {
    certificate = await Certificate.findOne({ membership: membership._id })
      .sort({ issueDate: -1 })
      .populate(
        'membership',
        'status validFrom validUntil registrationNumber directoryVisible approvedName type currentCertificate',
      );
  }

  return certificate;
}

export async function getPublicCertificateVerification(identifier) {
  const certificate = await locateMembershipCertificate(identifier);
  if (!certificate) return null;

  const membership = certificate.membership || null;
  const fallbackMembership = membership || {
    status: MEMBERSHIP_STATUSES.ACTIVE,
    registrationNumber: certificate.registrationNumber,
  };

  return {
    recordKind: 'membership',
    status: certificatePublicStatus(certificate, fallbackMembership),
    certificateStatus: certificate.status,
    certificateNumber: certificate.certificateNumber,
    registrationNumber:
      membership?.registrationNumber || certificate.registrationNumber,
    certificateTitle: certificate.certificateTitle,
    holderName: certificate.holderName,
    type: certificate.type,
    typeLabel: MEMBERSHIP_TYPE_LABELS[certificate.type] || certificate.type,
    issueDate: certificate.issueDate,
    expiryDate: certificate.expiryDate,
    verificationCode: certificate.verificationCode,
    replacementIssued: Boolean(certificate.replacedBy),
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

function fitText(font, value, maxWidth, initialSize, minimumSize = 12) {
  let size = initialSize;
  while (size > minimumSize && font.widthOfTextAtSize(value, size) > maxWidth) {
    size -= 1;
  }
  return size;
}

function drawCentered(page, font, text, y, size, color, pageWidth) {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x: Math.max(24, (pageWidth - width) / 2),
    y,
    size,
    font,
    color,
  });
}

export async function createCertificatePdf(certificateInput) {
  const certificate = certificateInput.toObject
    ? certificateInput.toObject()
    : certificateInput;

  const template = await getActiveCertificateTemplate(certificate.type).catch(() => null);
  const pdfDocument = await PDFDocument.create();
  const page = pdfDocument.addPage([841.89, 595.28]);
  const { width, height } = page.getSize();
  const regular = await pdfDocument.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDocument.embedFont(StandardFonts.HelveticaBold);
  const serif = await pdfDocument.embedFont(StandardFonts.TimesRomanBold);

  const navy = rgb(0.04, 0.12, 0.22);
  const teal = hexToRgbColor(template?.accentHex, rgb(0.04, 0.48, 0.46));
  const gold = rgb(0.82, 0.64, 0.2);
  const muted = rgb(0.32, 0.37, 0.42);
  const white = rgb(1, 1, 1);

  page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0.985, 0.99, 1) });
  page.drawRectangle({ x: 18, y: 18, width: width - 36, height: height - 36, borderColor: navy, borderWidth: 3 });
  page.drawRectangle({ x: 26, y: 26, width: width - 52, height: height - 52, borderColor: gold, borderWidth: 1 });
  page.drawRectangle({ x: 0, y: height - 86, width, height: 86, color: navy });

  drawCentered(page, serif, 'iRAP', height - 58, 30, white, width);
  drawCentered(page, bold, template?.heading || certificate.certificateTitle, height - 132, 22, navy, width);
  drawCentered(page, regular, template?.confirmationText || 'This certificate confirms the approved professional or accreditation record of', height - 166, 11, muted, width);

  const holderName = String(certificate.holderName || '').trim();
  const holderSize = fitText(serif, holderName, width - 180, 32, 17);
  drawCentered(page, serif, holderName, height - 225, holderSize, teal, width);

  page.drawLine({ start: { x: 160, y: height - 240 }, end: { x: width - 160, y: height - 240 }, thickness: 1, color: gold });

  const details = [
    ['Registration number', certificate.registrationNumber],
    ['Certificate number', certificate.certificateNumber],
    ['Issue date', new Date(certificate.issueDate).toLocaleDateString('en-GB', { timeZone: 'UTC' })],
    ['Expiry date', new Date(certificate.expiryDate).toLocaleDateString('en-GB', { timeZone: 'UTC' })],
    ['Current status', String(certificate.status || '').replaceAll('_', ' ')],
  ];

  let detailY = height - 290;
  for (const [label, value] of details) {
    page.drawText(`${label}:`, { x: 104, y: detailY, size: 10, font: bold, color: navy });
    page.drawText(String(value), { x: 228, y: detailY, size: 10, font: regular, color: muted });
    detailY -= 24;
  }

  const qrBuffer = await QRCode.toBuffer(certificate.verificationUrl, {
    type: 'png',
    width: 360,
    margin: 1,
    errorCorrectionLevel: 'M',
  });
  const qrImage = await pdfDocument.embedPng(qrBuffer);
  page.drawImage(qrImage, { x: width - 206, y: 104, width: 112, height: 112 });
  page.drawText('Scan to verify', { x: width - 184, y: 88, size: 9, font: bold, color: navy });

  page.drawLine({ start: { x: 96, y: 118 }, end: { x: 308, y: 118 }, thickness: 1, color: navy });
  const signatoryName = template?.signatoryName || certificate.authorizedSignatory.name;
  const signatoryTitle = template?.signatoryTitle || certificate.authorizedSignatory.title;
  page.drawText(signatoryName, { x: 96, y: 98, size: 11, font: bold, color: navy });
  page.drawText(signatoryTitle, { x: 96, y: 82, size: 9, font: regular, color: muted });

  const urlText = String(certificate.verificationUrl);
  const urlSize = fitText(regular, urlText, width - 220, 7, 5);
  drawCentered(page, regular, urlText, 47, urlSize, muted, width);
  if (template?.footerText) {
    const footerSize = fitText(regular, template.footerText, width - 180, 7, 5);
    drawCentered(page, regular, template.footerText, 30, footerSize, muted, width);
  }

  const bytes = Buffer.from(await pdfDocument.save());
  return {
    bytes,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
  };
}

export async function getCertificateForAccess({ certificateId, auth }) {
  const query = { _id: certificateId };
  const canManage =
    auth.permissions.includes('certificate:manage') ||
    auth.permissions.includes('system:manage');
  if (!canManage) query.owner = auth.userId;

  const certificate = await Certificate.findOne(query);
  if (!certificate) throw new ApiError(404, 'Certificate not found.');
  return certificate;
}

export async function listCertificateHistory(membershipId) {
  return Certificate.find({ membership: membershipId }).sort({ issueDate: -1 });
}

export async function revokeCertificate({ certificate, actorId, reason }) {
  if (certificate.status === CERTIFICATE_STATUSES.REVOKED) return certificate;
  const previousStatus = certificate.status;
  certificate.status = CERTIFICATE_STATUSES.REVOKED;
  certificate.revokedAt = new Date();
  certificate.revokedBy = actorId;
  certificate.revocationReason = reason;
  certificate.statusHistory.push({
    previousStatus,
    newStatus: CERTIFICATE_STATUSES.REVOKED,
    changedBy: actorId,
    reason,
  });
  await certificate.save();
  return certificate;
}

export async function synchronizeCurrentCertificateStatus(membership) {
  if (!membership.currentCertificate) return;
  const certificate = await Certificate.findById(membership.currentCertificate);
  if (!certificate || [CERTIFICATE_STATUSES.REVOKED, CERTIFICATE_STATUSES.REPLACED].includes(certificate.status)) {
    return;
  }

  let nextStatus = CERTIFICATE_STATUSES.ACTIVE;
  if (membership.status === MEMBERSHIP_STATUSES.SUSPENDED) {
    nextStatus = CERTIFICATE_STATUSES.SUSPENDED;
  } else if (
    [MEMBERSHIP_STATUSES.EXPIRED, MEMBERSHIP_STATUSES.GRACE_PERIOD].includes(membership.status)
  ) {
    nextStatus = CERTIFICATE_STATUSES.EXPIRED;
  } else if (membership.status === MEMBERSHIP_STATUSES.REVOKED) {
    nextStatus = CERTIFICATE_STATUSES.REVOKED;
  }

  if (certificate.status === nextStatus) return;
  const previousStatus = certificate.status;
  certificate.status = nextStatus;
  certificate.statusHistory.push({
    previousStatus,
    newStatus: nextStatus,
    changedBy: null,
    reason: 'Certificate status synchronized with the membership record.',
  });
  if (nextStatus === CERTIFICATE_STATUSES.REVOKED) {
    certificate.revokedAt ||= new Date();
    certificate.revocationReason ||= 'Membership record revoked.';
  }
  await certificate.save();
}

export async function findMembershipForCertificate(certificate) {
  return Membership.findById(certificate.membership);
}
