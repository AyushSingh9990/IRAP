import {
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
} from '../constants/auditActions.js';
import {
  CONTENT_PAGE_STATUSES,
  TEMPLATE_STATUSES,
} from '../constants/siteAdministration.js';
import CertificateTemplate from '../models/CertificateTemplate.js';
import ContentPage from '../models/ContentPage.js';
import EmailTemplate from '../models/EmailTemplate.js';
import SiteSetting from '../models/SiteSetting.js';
import { ApiError } from '../utils/ApiError.js';
import { recordSuccessfulAudit } from './auditLog.service.js';

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function safeSettingValue(setting) {
  if (!setting) return null;
  return {
    key: setting.key,
    group: setting.group,
    label: setting.label,
    description: setting.description,
    value: setting.value,
    valueType: setting.valueType,
    public: setting.public,
    updatedAt: setting.updatedAt,
  };
}

export async function getPublicSiteConfiguration() {
  const settings = await SiteSetting.find({ public: true }).sort({ group: 1, key: 1 });
  const groups = {};
  settings.forEach((setting) => {
    groups[setting.group] ||= {};
    groups[setting.group][setting.key] = setting.value;
  });
  return { groups, settings: settings.map(safeSettingValue) };
}

export async function listAdminSettings({ group, search }) {
  const query = {};
  if (group) query.group = group;
  if (search) {
    const expression = new RegExp(escapeRegex(search), 'i');
    query.$or = [{ key: expression }, { label: expression }, { description: expression }];
  }
  const settings = await SiteSetting.find(query).sort({ group: 1, key: 1 });
  return settings.map((item) => item.toJSON());
}

export async function upsertAdminSetting({ key, input, actor, context }) {
  const previous = await SiteSetting.findOne({ key }).lean();
  const setting = await SiteSetting.findOneAndUpdate(
    { key },
    {
      key,
      group: input.group,
      label: input.label,
      description: input.description,
      value: input.value,
      valueType: input.valueType,
      public: input.public,
      updatedBy: actor.userId,
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );

  await recordSuccessfulAudit(
    {
      action: AUDIT_ACTIONS.SITE_SETTING_UPDATED,
      actor,
      entityType: AUDIT_ENTITY_TYPES.SITE_SETTING,
      entityId: key,
      previousValues: previous || {},
      reason: `Site setting ${key} updated.`,
      context,
    },
    setting.toJSON(),
  );

  return setting.toJSON();
}

export async function getPublishedContentPage(slug) {
  const page = await ContentPage.findOne({
    slug,
    status: CONTENT_PAGE_STATUSES.PUBLISHED,
    publishedAt: { $lte: new Date() },
  });
  return page?.toJSON() || null;
}

export async function listAdminContentPages({ status, search }) {
  const query = {};
  if (status) query.status = status;
  if (search) {
    const expression = new RegExp(escapeRegex(search), 'i');
    query.$or = [{ slug: expression }, { title: expression }, { summary: expression }];
  }
  const pages = await ContentPage.find(query).sort({ updatedAt: -1 });
  return pages.map((page) => page.toJSON());
}

function normalizePageInput(input, current = {}) {
  const nextStatus = input.status ?? current.status ?? CONTENT_PAGE_STATUSES.DRAFT;
  return {
    ...input,
    status: nextStatus,
    publishedAt:
      nextStatus === CONTENT_PAGE_STATUSES.PUBLISHED
        ? current.publishedAt || new Date()
        : null,
  };
}

export async function createAdminContentPage({ input, actor, context }) {
  if (await ContentPage.exists({ slug: input.slug })) {
    throw new ApiError(409, 'A content page with this slug already exists.');
  }
  const page = await ContentPage.create({
    ...normalizePageInput(input),
    updatedBy: actor.userId,
  });

  await recordSuccessfulAudit(
    {
      action: AUDIT_ACTIONS.CONTENT_PAGE_CREATED,
      actor,
      entityType: AUDIT_ENTITY_TYPES.CONTENT_PAGE,
      entityId: page.id,
      reason: `Content page ${page.slug} created.`,
      context,
    },
    page.toJSON(),
  );

  return page.toJSON();
}

export async function updateAdminContentPage({ pageId, input, actor, context }) {
  const page = await ContentPage.findById(pageId);
  if (!page) throw new ApiError(404, 'Content page not found.');
  if (input.slug && input.slug !== page.slug) {
    const exists = await ContentPage.exists({ slug: input.slug, _id: { $ne: page._id } });
    if (exists) throw new ApiError(409, 'A content page with this slug already exists.');
  }

  const previous = page.toJSON();
  Object.assign(page, normalizePageInput(input, page));
  page.updatedBy = actor.userId;
  await page.save();

  await recordSuccessfulAudit(
    {
      action: AUDIT_ACTIONS.CONTENT_PAGE_UPDATED,
      actor,
      entityType: AUDIT_ENTITY_TYPES.CONTENT_PAGE,
      entityId: page.id,
      previousValues: previous,
      reason: `Content page ${page.slug} updated.`,
      context,
    },
    page.toJSON(),
  );

  return page.toJSON();
}

export async function listAdminTemplates({ type, status, search }) {
  const Model = type === 'certificate' ? CertificateTemplate : EmailTemplate;
  const query = {};
  if (status) query.status = status;
  if (search) {
    const expression = new RegExp(escapeRegex(search), 'i');
    query.$or = [{ key: expression }, { name: expression }];
  }
  const templates = await Model.find(query).sort({ name: 1 });
  return templates.map((template) => template.toJSON());
}

async function createTemplate({ Model, input, actor, context, action, entityType }) {
  if (await Model.exists({ key: input.key })) {
    throw new ApiError(409, 'A template with this key already exists.');
  }
  const template = await Model.create({ ...input, updatedBy: actor.userId });
  await recordSuccessfulAudit(
    {
      action,
      actor,
      entityType,
      entityId: template.id,
      reason: `Template ${template.key} created.`,
      context,
    },
    template.toJSON(),
  );
  return template.toJSON();
}

async function updateTemplate({ Model, templateId, input, actor, context, action, entityType }) {
  const template = await Model.findById(templateId);
  if (!template) throw new ApiError(404, 'Template not found.');
  if (input.key && input.key !== template.key) {
    const exists = await Model.exists({ key: input.key, _id: { $ne: template._id } });
    if (exists) throw new ApiError(409, 'A template with this key already exists.');
  }
  const previous = template.toJSON();
  Object.assign(template, input, { updatedBy: actor.userId });
  await template.save();
  await recordSuccessfulAudit(
    {
      action,
      actor,
      entityType,
      entityId: template.id,
      previousValues: previous,
      reason: `Template ${template.key} updated.`,
      context,
    },
    template.toJSON(),
  );
  return template.toJSON();
}

export function createAdminEmailTemplate(input) {
  return createTemplate({
    ...input,
    Model: EmailTemplate,
    action: AUDIT_ACTIONS.EMAIL_TEMPLATE_CREATED,
    entityType: AUDIT_ENTITY_TYPES.EMAIL_TEMPLATE,
  });
}

export function updateAdminEmailTemplate(input) {
  return updateTemplate({
    ...input,
    Model: EmailTemplate,
    action: AUDIT_ACTIONS.EMAIL_TEMPLATE_UPDATED,
    entityType: AUDIT_ENTITY_TYPES.EMAIL_TEMPLATE,
  });
}

export function createAdminCertificateTemplate(input) {
  return createTemplate({
    ...input,
    Model: CertificateTemplate,
    action: AUDIT_ACTIONS.CERTIFICATE_TEMPLATE_CREATED,
    entityType: AUDIT_ENTITY_TYPES.CERTIFICATE_TEMPLATE,
  });
}

export function updateAdminCertificateTemplate(input) {
  return updateTemplate({
    ...input,
    Model: CertificateTemplate,
    action: AUDIT_ACTIONS.CERTIFICATE_TEMPLATE_UPDATED,
    entityType: AUDIT_ENTITY_TYPES.CERTIFICATE_TEMPLATE,
  });
}

export async function getActiveCertificateTemplate(type) {
  return CertificateTemplate.findOne({
    certificateType: type,
    status: TEMPLATE_STATUSES.ACTIVE,
  }).lean();
}
