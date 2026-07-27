import mongoose from 'mongoose';
import {
  AUDIT_ACTION_VALUES,
  AUDIT_ENTITY_TYPE_VALUES,
  AUDIT_OUTCOMES,
  AUDIT_OUTCOME_VALUES,
} from '../constants/auditActions.js';

const auditLogSchema = new mongoose.Schema(
  {
    action: { type: String, enum: AUDIT_ACTION_VALUES, required: true, index: true },
    outcome: {
      type: String,
      enum: AUDIT_OUTCOME_VALUES,
      default: AUDIT_OUTCOMES.PENDING,
      index: true,
    },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    actorRoles: { type: [String], default: [] },
    entityType: {
      type: String,
      enum: AUDIT_ENTITY_TYPE_VALUES,
      required: true,
      index: true,
    },
    entityId: { type: String, required: true, trim: true, maxlength: 120, index: true },
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      default: null,
      index: true,
    },
    subjectUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    reason: { type: String, trim: true, maxlength: 1000, default: '' },
    previousValues: { type: mongoose.Schema.Types.Mixed, default: {} },
    newValues: { type: mongoose.Schema.Types.Mixed, default: {} },
    failureMessage: { type: String, trim: true, maxlength: 1000, default: '' },
    ipAddress: { type: String, trim: true, maxlength: 128, default: '' },
    userAgent: { type: String, trim: true, maxlength: 500, default: '' },
    requestId: { type: String, trim: true, maxlength: 160, default: '' },
    completedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    minimize: false,
    toJSON: {
      transform(_document, returned) {
        returned.id = returned._id?.toString();
        delete returned._id;
        delete returned.__v;
        return returned;
      },
    },
  },
);

auditLogSchema.index({ application: 1, createdAt: -1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, outcome: 1, createdAt: -1 });

auditLogSchema.pre('save', async function preventCompletedMutation() {
  if (this.isNew) return;
  const persisted = await this.constructor
    .findById(this._id)
    .select('outcome')
    .lean();
  if (persisted && persisted.outcome !== AUDIT_OUTCOMES.PENDING) {
    throw new Error('Completed audit entries are immutable.');
  }
});

const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
