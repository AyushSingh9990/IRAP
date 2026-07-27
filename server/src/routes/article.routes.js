import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { PERMISSIONS } from '../constants/permissions.js';
import {
  adminArticle,
  adminArticles,
  adminFeaturedImage,
  adminModerators,
  adminTaxonomy,
  approve,
  archive,
  assignModerator,
  authorMemberships,
  createArticle,
  createCategory,
  createTag,
  deleteArticle,
  myArticle,
  myArticles,
  myFeaturedImage,
  publicArticle,
  publicArticles,
  publicAuthor,
  publicImage,
  publicTaxonomy,
  publish,
  reject,
  removeFeaturedImage,
  requestChanges,
  restore,
  saveArticle,
  submitMyArticle,
  updateCategory,
  updateTag,
  uploadFeaturedImage,
} from '../controllers/article.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorizePermissions } from '../middlewares/authorize.js';
import { requireAuthenticationService } from '../middlewares/requireDatabase.js';
import { imageUpload } from '../middlewares/upload.js';
import { validate } from '../middlewares/validate.js';
import { validateUploadedFileSignature } from '../middlewares/validateFileSignature.js';
import {
  articleDecisionSchema,
  articleIdSchema,
  articleMediaSchema,
  assignArticleModeratorSchema,
  createArticleCategorySchema,
  createArticleSchema,
  createArticleTagSchema,
  listAdminArticlesSchema,
  listPublicArticlesSchema,
  listSelfArticlesSchema,
  listTaxonomySchema,
  publicArticleAuthorSchema,
  publicArticleSlugSchema,
  submitArticleSchema,
  updateArticleCategorySchema,
  updateArticleSchema,
  updateArticleTagSchema,
  uploadArticleImageSchema,
} from '../schemas/article.schema.js';

const router = Router();

const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 240,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many article requests. Please try again later.',
    errors: [],
  },
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many article image uploads. Please try again later.',
    errors: [],
  },
});

router.get('/', publicLimiter, validate(listPublicArticlesSchema), publicArticles);
router.get('/taxonomy', publicLimiter, publicTaxonomy);
router.get('/authors/:authorSlug', publicLimiter, validate(publicArticleAuthorSchema), publicAuthor);
router.get('/media/:articleId', publicLimiter, validate(articleMediaSchema), publicImage);
router.get('/public/:slug', publicLimiter, validate(publicArticleSlugSchema), publicArticle);

router.use(requireAuthenticationService, authenticate);

router.get(
  '/self/author-memberships',
  authorizePermissions(PERMISSIONS.ARTICLE_CREATE_SELF),
  authorMemberships,
);
router.get(
  '/self',
  authorizePermissions(PERMISSIONS.ARTICLE_READ_SELF),
  validate(listSelfArticlesSchema),
  myArticles,
);
router.post(
  '/self',
  authorizePermissions(PERMISSIONS.ARTICLE_CREATE_SELF),
  validate(createArticleSchema),
  createArticle,
);
router.get(
  '/self/:articleId',
  authorizePermissions(PERMISSIONS.ARTICLE_READ_SELF),
  validate(articleIdSchema),
  myArticle,
);
router.patch(
  '/self/:articleId',
  authorizePermissions(PERMISSIONS.ARTICLE_UPDATE_SELF),
  validate(updateArticleSchema),
  saveArticle,
);
router.delete(
  '/self/:articleId',
  authorizePermissions(PERMISSIONS.ARTICLE_UPDATE_SELF),
  validate(articleIdSchema),
  deleteArticle,
);
router.post(
  '/self/:articleId/submit',
  authorizePermissions(PERMISSIONS.ARTICLE_SUBMIT_SELF),
  validate(submitArticleSchema),
  submitMyArticle,
);
router.post(
  '/self/:articleId/featured-image',
  authorizePermissions(PERMISSIONS.ARTICLE_UPDATE_SELF),
  uploadLimiter,
  imageUpload.single('file'),
  validateUploadedFileSignature,
  validate(uploadArticleImageSchema),
  uploadFeaturedImage,
);
router.get(
  '/self/:articleId/featured-image/content',
  authorizePermissions(PERMISSIONS.ARTICLE_READ_SELF),
  validate(articleIdSchema),
  myFeaturedImage,
);
router.delete(
  '/self/:articleId/featured-image',
  authorizePermissions(PERMISSIONS.ARTICLE_UPDATE_SELF),
  validate(articleIdSchema),
  removeFeaturedImage,
);

router.get(
  '/admin/moderators',
  authorizePermissions(PERMISSIONS.ARTICLE_MODERATE),
  adminModerators,
);
router.get(
  '/admin/taxonomy',
  authorizePermissions(PERMISSIONS.ARTICLE_TAXONOMY_MANAGE),
  validate(listTaxonomySchema),
  adminTaxonomy,
);
router.post(
  '/admin/categories',
  authorizePermissions(PERMISSIONS.ARTICLE_TAXONOMY_MANAGE),
  validate(createArticleCategorySchema),
  createCategory,
);
router.patch(
  '/admin/categories/:categoryId',
  authorizePermissions(PERMISSIONS.ARTICLE_TAXONOMY_MANAGE),
  validate(updateArticleCategorySchema),
  updateCategory,
);
router.post(
  '/admin/tags',
  authorizePermissions(PERMISSIONS.ARTICLE_TAXONOMY_MANAGE),
  validate(createArticleTagSchema),
  createTag,
);
router.patch(
  '/admin/tags/:tagId',
  authorizePermissions(PERMISSIONS.ARTICLE_TAXONOMY_MANAGE),
  validate(updateArticleTagSchema),
  updateTag,
);
router.get(
  '/admin/queue',
  authorizePermissions(PERMISSIONS.ARTICLE_MODERATE),
  validate(listAdminArticlesSchema),
  adminArticles,
);
router.get(
  '/admin/:articleId/featured-image/content',
  authorizePermissions(PERMISSIONS.ARTICLE_MODERATE),
  validate(articleIdSchema),
  adminFeaturedImage,
);
router.get(
  '/admin/:articleId',
  authorizePermissions(PERMISSIONS.ARTICLE_MODERATE),
  validate(articleIdSchema),
  adminArticle,
);
router.patch(
  '/admin/:articleId/assignment',
  authorizePermissions(PERMISSIONS.ARTICLE_MODERATE),
  validate(assignArticleModeratorSchema),
  assignModerator,
);
router.post(
  '/admin/:articleId/request-changes',
  authorizePermissions(PERMISSIONS.ARTICLE_MODERATE),
  validate(articleDecisionSchema),
  requestChanges,
);
router.post(
  '/admin/:articleId/approve',
  authorizePermissions(PERMISSIONS.ARTICLE_MODERATE),
  validate(articleDecisionSchema),
  approve,
);
router.post(
  '/admin/:articleId/publish',
  authorizePermissions(PERMISSIONS.ARTICLE_PUBLISH),
  validate(articleDecisionSchema),
  publish,
);
router.post(
  '/admin/:articleId/reject',
  authorizePermissions(PERMISSIONS.ARTICLE_MODERATE),
  validate(articleDecisionSchema),
  reject,
);
router.post(
  '/admin/:articleId/archive',
  authorizePermissions(PERMISSIONS.ARTICLE_PUBLISH),
  validate(articleDecisionSchema),
  archive,
);
router.post(
  '/admin/:articleId/restore',
  authorizePermissions(PERMISSIONS.ARTICLE_PUBLISH),
  validate(articleDecisionSchema),
  restore,
);

export default router;
