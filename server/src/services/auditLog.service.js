import { AUDIT_OUTCOMES } from '../constants/auditActions.js';
import AuditLog from '../models/AuditLog.js';

function contextFields(context = {}) {
  return {
    ipAddress: context.ipAddress || '',
    userAgent: context.userAgent || '',
    requestId: context.requestId || '',
  };
}

export async function startAuditEntry({
  action,
  actor,
  entityType,
  entityId,
  application = null,
  subjectUser = null,
  reason = '',
  previousValues = {},
  context = {},
}) {
  return AuditLog.create({
    action,
    actor: actor.userId,
    actorRoles: actor.roles || [],
    entityType,
    entityId: String(entityId),
    application,
    subjectUser,
    reason,
    previousValues,
    outcome: AUDIT_OUTCOMES.PENDING,
    ...contextFields(context),
  });
}

export async function completeAuditEntry(entry, newValues = {}) {
  entry.outcome = AUDIT_OUTCOMES.SUCCESS;
  entry.newValues = newValues;
  entry.completedAt = new Date();
  await entry.save();
  return entry;
}

export async function failAuditEntry(entry, error) {
  entry.outcome = AUDIT_OUTCOMES.FAILED;
  entry.failureMessage = String(error?.message || 'Administrative action failed.').slice(0, 1000);
  entry.completedAt = new Date();
  await entry.save().catch(() => {});
}

export async function recordSuccessfulAudit(input, newValues = {}) {
  const entry = await startAuditEntry(input);
  await completeAuditEntry(entry, newValues);
  return entry;
}
