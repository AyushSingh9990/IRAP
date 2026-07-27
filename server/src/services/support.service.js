import { customAlphabet } from 'nanoid';
import {
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
} from '../constants/auditActions.js';
import { PERMISSIONS } from '../constants/permissions.js';
import Complaint from '../models/Complaint.js';
import ContactSubmission from '../models/ContactSubmission.js';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { recordSuccessfulAudit } from './auditLog.service.js';
import { resolveUserPermissions } from './rolePermission.service.js';

const code = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8);

async function uniqueReference(Model, prefix) {
  const year = new Date().getUTCFullYear();
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const reference = `IRAP-${prefix}-${year}-${code()}`;
    if (!(await Model.exists({ reference }))) return reference;
  }
  throw new Error('Unable to generate a unique support reference.');
}

export async function createContactSubmission({ input, context }) {
  const reference = await uniqueReference(ContactSubmission, 'ENQ');
  const submission = await ContactSubmission.create({
    reference,
    name: input.name,
    email: input.email,
    telephone: input.telephone,
    subject: input.subject,
    category: input.category,
    message: input.message,
    submittedIp: context.ipAddress || '',
    userAgent: context.userAgent || '',
  });
  return { reference: submission.reference, createdAt: submission.createdAt };
}

export async function createComplaint({ input, context }) {
  const reference = await uniqueReference(Complaint, 'CMP');
  const complaint = await Complaint.create({
    reference,
    name: input.name,
    email: input.email,
    telephone: input.telephone,
    subject: input.subject,
    message: input.message,
    relatedReference: input.relatedReference,
    submittedIp: context.ipAddress || '',
    userAgent: context.userAgent || '',
  });
  return { reference: complaint.reference, createdAt: complaint.createdAt };
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function listSupportQueue({ kind, status, category, priority, search, page, limit }) {
  const Model = kind === 'complaint' ? Complaint : ContactSubmission;
  const query = {};
  if (status) query.status = status;
  if (kind === 'contact' && category) query.category = category;
  if (kind === 'complaint' && priority) query.priority = priority;
  if (search) {
    const expression = new RegExp(escapeRegex(search), 'i');
    query.$or = [
      { reference: expression },
      { name: expression },
      { email: expression },
      { subject: expression },
    ];
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Model.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('assignedTo', 'displayName firstName lastName email'),
    Model.countDocuments(query),
  ]);

  return {
    items: items.map((item) => item.toJSON()),
    meta: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  };
}

export async function listSupportAssignees() {
  const candidates = await User.find({ accountStatus: 'active' }).select(
    'displayName firstName lastName email roles additionalPermissions',
  );
  const eligible = [];
  for (const user of candidates) {
    const permissions = await resolveUserPermissions(user);
    if (permissions.includes(PERMISSIONS.SUPPORT_MANAGE)) {
      eligible.push({
        id: user.id,
        displayName: user.displayName || user.fullName,
        email: user.email,
      });
    }
  }
  return eligible.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export async function updateSupportSubmission({
  kind,
  submissionId,
  input,
  actor,
  context,
}) {
  const Model = kind === 'complaint' ? Complaint : ContactSubmission;
  const item = await Model.findById(submissionId);
  if (!item) throw new ApiError(404, 'Support record not found.');
  const previous = item.toJSON();

  item.status = input.status;
  item.assignedTo = input.assignedTo || null;
  item.internalNotes = input.internalNotes;
  item.responseSummary = input.responseSummary;
  if (kind === 'complaint' && input.priority) item.priority = input.priority;
  if (input.responseSummary) item.lastResponseAt = new Date();
  await item.save();

  await recordSuccessfulAudit(
    {
      action:
        kind === 'complaint'
          ? AUDIT_ACTIONS.COMPLAINT_UPDATED
          : AUDIT_ACTIONS.SUPPORT_SUBMISSION_UPDATED,
      actor,
      entityType:
        kind === 'complaint'
          ? AUDIT_ENTITY_TYPES.COMPLAINT
          : AUDIT_ENTITY_TYPES.CONTACT_SUBMISSION,
      entityId: item.id,
      previousValues: previous,
      reason: `${kind} record ${item.reference} updated.`,
      context,
    },
    item.toJSON(),
  );

  return item.toJSON();
}
