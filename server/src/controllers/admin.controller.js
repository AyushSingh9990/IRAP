import mongoose from 'mongoose';
import AuditLog from '../models/AuditLog.js';
import Complaint from '../models/Complaint.js';
import ContactSubmission from '../models/ContactSubmission.js';
import User from '../models/User.js';
import {
  createAdminCertificateTemplate,
  createAdminContentPage,
  createAdminEmailTemplate,
  listAdminContentPages,
  listAdminSettings,
  listAdminTemplates,
  updateAdminCertificateTemplate,
  updateAdminContentPage,
  updateAdminEmailTemplate,
  upsertAdminSetting,
} from '../services/siteContent.service.js';
import {
  listSupportAssignees,
  listSupportQueue,
  updateSupportSubmission,
} from '../services/support.service.js';
import {
  listAdminUsers,
  updateAdminUser,
} from '../services/userAdministration.service.js';
import {
  listRoleDefinitions,
  updateRoleDefinition,
} from '../services/rolePermission.service.js';
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

export const settings = asyncHandler(async (request, response) => {
  const items = await listAdminSettings(request.validated.query);
  response.status(200).json(
    new ApiResponse({ message: 'Site settings loaded.', data: { items } }),
  );
});

export const saveSetting = asyncHandler(async (request, response) => {
  const setting = await upsertAdminSetting({
    key: request.validated.params.key,
    input: { ...request.validated.body, key: request.validated.params.key },
    actor: actorFromRequest(request),
    context: contextFromRequest(request),
  });
  response.status(200).json(
    new ApiResponse({ message: 'Site setting saved.', data: { setting } }),
  );
});

export const contentPages = asyncHandler(async (request, response) => {
  const items = await listAdminContentPages(request.validated.query);
  response.status(200).json(
    new ApiResponse({ message: 'Content pages loaded.', data: { items } }),
  );
});

export const createContentPage = asyncHandler(async (request, response) => {
  const page = await createAdminContentPage({
    input: request.validated.body,
    actor: actorFromRequest(request),
    context: contextFromRequest(request),
  });
  response.status(201).json(
    new ApiResponse({ message: 'Content page created.', data: { page } }),
  );
});

export const updateContentPage = asyncHandler(async (request, response) => {
  const page = await updateAdminContentPage({
    pageId: request.validated.params.pageId,
    input: request.validated.body,
    actor: actorFromRequest(request),
    context: contextFromRequest(request),
  });
  response.status(200).json(
    new ApiResponse({ message: 'Content page updated.', data: { page } }),
  );
});

export const templates = asyncHandler(async (request, response) => {
  const items = await listAdminTemplates(request.validated.query);
  response.status(200).json(
    new ApiResponse({ message: 'Templates loaded.', data: { items } }),
  );
});

export const createEmailTemplate = asyncHandler(async (request, response) => {
  const template = await createAdminEmailTemplate({
    input: request.validated.body,
    actor: actorFromRequest(request),
    context: contextFromRequest(request),
  });
  response.status(201).json(
    new ApiResponse({ message: 'Email template created.', data: { template } }),
  );
});

export const updateEmailTemplate = asyncHandler(async (request, response) => {
  const template = await updateAdminEmailTemplate({
    templateId: request.validated.params.templateId,
    input: request.validated.body,
    actor: actorFromRequest(request),
    context: contextFromRequest(request),
  });
  response.status(200).json(
    new ApiResponse({ message: 'Email template updated.', data: { template } }),
  );
});

export const createCertificateTemplate = asyncHandler(async (request, response) => {
  const template = await createAdminCertificateTemplate({
    input: request.validated.body,
    actor: actorFromRequest(request),
    context: contextFromRequest(request),
  });
  response.status(201).json(
    new ApiResponse({ message: 'Certificate template created.', data: { template } }),
  );
});

export const updateCertificateTemplate = asyncHandler(async (request, response) => {
  const template = await updateAdminCertificateTemplate({
    templateId: request.validated.params.templateId,
    input: request.validated.body,
    actor: actorFromRequest(request),
    context: contextFromRequest(request),
  });
  response.status(200).json(
    new ApiResponse({ message: 'Certificate template updated.', data: { template } }),
  );
});

export const supportQueue = asyncHandler(async (request, response) => {
  const result = await listSupportQueue(request.validated.query);
  response.status(200).json(
    new ApiResponse({
      message: 'Support queue loaded.',
      data: { items: result.items },
      meta: result.meta,
    }),
  );
});

export const supportAssignees = asyncHandler(async (_request, response) => {
  const assignees = await listSupportAssignees();
  response.status(200).json(
    new ApiResponse({ message: 'Support assignees loaded.', data: { assignees } }),
  );
});

export const saveSupportRecord = asyncHandler(async (request, response) => {
  const item = await updateSupportSubmission({
    kind: request.validated.query.kind,
    submissionId: request.validated.params.submissionId,
    input: request.validated.body,
    actor: actorFromRequest(request),
    context: contextFromRequest(request),
  });
  response.status(200).json(
    new ApiResponse({ message: 'Support record updated.', data: { item } }),
  );
});

export const users = asyncHandler(async (request, response) => {
  const result = await listAdminUsers(request.validated.query);
  response.status(200).json(
    new ApiResponse({
      message: 'Users loaded.',
      data: { users: result.items },
      meta: result.meta,
    }),
  );
});

export const saveUser = asyncHandler(async (request, response) => {
  const user = await updateAdminUser({
    userId: request.validated.params.userId,
    input: request.validated.body,
    actor: actorFromRequest(request),
    context: contextFromRequest(request),
  });
  response.status(200).json(
    new ApiResponse({ message: 'User access updated.', data: { user } }),
  );
});

export const roles = asyncHandler(async (_request, response) => {
  const items = await listRoleDefinitions();
  response.status(200).json(
    new ApiResponse({ message: 'Role definitions loaded.', data: { items } }),
  );
});

export const saveRole = asyncHandler(async (request, response) => {
  const role = await updateRoleDefinition({
    role: request.validated.params.role,
    input: request.validated.body,
    actor: actorFromRequest(request),
    context: contextFromRequest(request),
  });
  response.status(200).json(
    new ApiResponse({ message: 'Role definition updated.', data: { role } }),
  );
});

export const systemHealth = asyncHandler(async (_request, response) => {
  const [usersCount, openContacts, openComplaints, auditFailures] = await Promise.all([
    User.countDocuments({ deletedAt: null }),
    ContactSubmission.countDocuments({ status: { $in: ['new', 'open'] } }),
    Complaint.countDocuments({ status: { $in: ['new', 'open'] } }),
    AuditLog.countDocuments({ outcome: 'failed', createdAt: { $gte: new Date(Date.now() - 86400000) } }),
  ]);

  response.status(200).json(
    new ApiResponse({
      message: 'System health loaded.',
      data: {
        health: {
          status: mongoose.connection.readyState === 1 ? 'operational' : 'degraded',
          databaseState: mongoose.connection.readyState,
          uptimeSeconds: Math.floor(process.uptime()),
          nodeVersion: process.version,
          environment: process.env.NODE_ENV || 'development',
          counts: { users: usersCount, openContacts, openComplaints, auditFailures24h: auditFailures },
          checkedAt: new Date().toISOString(),
        },
      },
    }),
  );
});
