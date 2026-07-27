import { Router } from 'express';
import {
  contentPages,
  createCertificateTemplate,
  createContentPage,
  createEmailTemplate,
  roles,
  saveRole,
  saveSetting,
  saveSupportRecord,
  saveUser,
  settings,
  supportAssignees,
  supportQueue,
  systemHealth,
  templates,
  updateCertificateTemplate,
  updateContentPage,
  updateEmailTemplate,
  users,
} from '../controllers/admin.controller.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorizePermissions } from '../middlewares/authorize.js';
import { requireDatabase } from '../middlewares/requireDatabase.js';
import { validate } from '../middlewares/validate.js';
import {
  adminContentPageListSchema,
  adminSettingListSchema,
  createCertificateTemplateSchema,
  createContentPageSchema,
  createEmailTemplateSchema,
  roleListSchema,
  supportQueueSchema,
  supportUpdateSchema,
  templateListSchema,
  updateCertificateTemplateSchema,
  updateContentPageSchema,
  updateEmailTemplateSchema,
  updateRoleDefinitionSchema,
  updateUserAdministrationSchema,
  upsertSettingSchema,
  userListSchema,
} from '../schemas/site.schema.js';

const router = Router();
router.use(requireDatabase, authenticate);

router.get('/settings', authorizePermissions(PERMISSIONS.SITE_SETTINGS_MANAGE), validate(adminSettingListSchema), settings);
router.put('/settings/:key', authorizePermissions(PERMISSIONS.SITE_SETTINGS_MANAGE), validate(upsertSettingSchema), saveSetting);

router.get('/content-pages', authorizePermissions(PERMISSIONS.CONTENT_MANAGE), validate(adminContentPageListSchema), contentPages);
router.post('/content-pages', authorizePermissions(PERMISSIONS.CONTENT_MANAGE), validate(createContentPageSchema), createContentPage);
router.patch('/content-pages/:pageId', authorizePermissions(PERMISSIONS.CONTENT_MANAGE), validate(updateContentPageSchema), updateContentPage);

router.get('/templates', authorizePermissions(PERMISSIONS.TEMPLATE_MANAGE), validate(templateListSchema), templates);
router.post('/templates/email', authorizePermissions(PERMISSIONS.TEMPLATE_MANAGE), validate(createEmailTemplateSchema), createEmailTemplate);
router.patch('/templates/email/:templateId', authorizePermissions(PERMISSIONS.TEMPLATE_MANAGE), validate(updateEmailTemplateSchema), updateEmailTemplate);
router.post('/templates/certificate', authorizePermissions(PERMISSIONS.TEMPLATE_MANAGE), validate(createCertificateTemplateSchema), createCertificateTemplate);
router.patch('/templates/certificate/:templateId', authorizePermissions(PERMISSIONS.TEMPLATE_MANAGE), validate(updateCertificateTemplateSchema), updateCertificateTemplate);

router.get('/support', authorizePermissions(PERMISSIONS.SUPPORT_MANAGE), validate(supportQueueSchema), supportQueue);
router.get('/support-assignees', authorizePermissions(PERMISSIONS.SUPPORT_MANAGE), supportAssignees);
router.patch('/support/:submissionId', authorizePermissions(PERMISSIONS.SUPPORT_MANAGE), validate(supportUpdateSchema), saveSupportRecord);

router.get('/users', authorizePermissions(PERMISSIONS.USER_MANAGE), validate(userListSchema), users);
router.patch('/users/:userId', authorizePermissions(PERMISSIONS.USER_MANAGE), validate(updateUserAdministrationSchema), saveUser);

router.get('/roles', authorizePermissions(PERMISSIONS.ROLE_MANAGE), validate(roleListSchema), roles);
router.patch('/roles/:role', authorizePermissions(PERMISSIONS.ROLE_MANAGE), validate(updateRoleDefinitionSchema), saveRole);

router.get('/system-health', authorizePermissions(PERMISSIONS.SYSTEM_MANAGE), systemHealth);

export default router;
