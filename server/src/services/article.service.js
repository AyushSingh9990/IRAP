import {
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
} from '../constants/auditActions.js';
import {
  ARTICLE_AUTHOR_TYPE_VALUES,
  ARTICLE_EDITABLE_STATUSES,
  ARTICLE_STATUSES,
  ARTICLE_TAXONOMY_STATUSES,
} from '../constants/articleConstants.js';
import { MEMBERSHIP_STATUSES } from '../constants/membershipConstants.js';
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_TYPES,
} from '../constants/notificationConstants.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { environment } from '../config/environment.js';
import Article from '../models/Article.js';
import ArticleCategory from '../models/ArticleCategory.js';
import ArticleReview from '../models/ArticleReview.js';
import ArticleTag from '../models/ArticleTag.js';
import Membership from '../models/Membership.js';
import PublicProfile from '../models/PublicProfile.js';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { recordSuccessfulAudit } from './auditLog.service.js';
import {
  deleteDocumentAsset,
  openDocumentAsset,
  storeDocumentAsset,
} from './documentStorage.service.js';
import { createNotificationSafely } from './notification.service.js';
import { resolveUserPermissions } from './rolePermission.service.js';

function asId(value) {
  return value?.toString?.() || String(value || '');
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function slugify(value, maximum = 180) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maximum);
}

function plainText(value) {
  return String(value || '')
    .replace(/\r\n?/g, '\n')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .trim();
}

function articleMetrics(content) {
  const normalized = plainText(content);
  const wordCount = normalized ? normalized.split(/\s+/).filter(Boolean).length : 0;
  return {
    wordCount,
    readingMinutes: wordCount ? Math.max(1, Math.ceil(wordCount / 220)) : 0,
  };
}

function membershipEligible(membership) {
  return (
    membership &&
    ARTICLE_AUTHOR_TYPE_VALUES.includes(membership.type) &&
    [MEMBERSHIP_STATUSES.ACTIVE, MEMBERSHIP_STATUSES.RENEWAL_DUE].includes(
      membership.status,
    ) &&
    membership.validUntil?.getTime() >= Date.now()
  );
}

async function eligibleMembership({ membershipId, ownerId }) {
  const membership = await Membership.findOne({
    _id: membershipId,
    owner: ownerId,
    type: { $in: ARTICLE_AUTHOR_TYPE_VALUES },
  });

  if (!membership) {
    throw new ApiError(404, 'Approved provider or organization record not found.');
  }

  if (!membershipEligible(membership)) {
    throw new ApiError(
      409,
      'An active and unexpired training-provider or organization accreditation is required.',
    );
  }

  return membership;
}

async function authorIdentity(membership) {
  const publicProfile = await PublicProfile.findOne({
    membership: membership._id,
    profileType: membership.type,
    published: true,
  }).select('slug displayName');

  const name = publicProfile?.displayName || membership.approvedName;
  const suffix = asId(membership._id).slice(-8);
  return {
    authorName: name,
    authorSlug:
      publicProfile?.slug ||
      `${slugify(name, 160) || 'author'}-${suffix}`,
  };
}

function imageUrl(articleId, kind = 'public') {
  const route =
    kind === 'public'
      ? `/api/v1/articles/media/${articleId}`
      : kind === 'admin'
        ? `/api/v1/articles/admin/${articleId}/featured-image/content`
        : `/api/v1/articles/self/${articleId}/featured-image/content`;
  return `${environment.serverUrl.replace(/\/$/, '')}${route}`;
}

function serializeArticle(article, { includePrivate = false, imageKind = 'public' } = {}) {
  const source = article.toJSON ? article.toJSON() : { ...article };
  const id = source.id || asId(source._id);
  const result = {
    ...source,
    id,
    canonicalPath: source.slug ? `/articles/${source.slug}` : '',
    authorPath: source.authorSlug ? `/articles/author/${source.authorSlug}` : '',
    hasFeaturedImage: Boolean(source.featuredImage),
    featuredImageAltText: source.featuredImage?.altText || '',
    featuredImageUrl: source.featuredImage ? imageUrl(id, imageKind) : '',
    isScheduled:
      source.status === ARTICLE_STATUSES.PUBLISHED &&
      Boolean(source.publishedAt) &&
      new Date(source.publishedAt).getTime() > Date.now(),
    isPubliclyAvailable:
      source.status === ARTICLE_STATUSES.PUBLISHED &&
      Boolean(source.publishedAt) &&
      new Date(source.publishedAt).getTime() <= Date.now(),
  };

  if (!includePrivate) {
    delete result.author;
    delete result.authorMembership;
    delete result.category;
    delete result.tags;
    delete result.featuredImage;
    delete result.assignedModerator;
    delete result.latestAuthorVisibleNote;
    delete result.declarationAccepted;
    delete result.submittedAt;
    delete result.reviewStartedAt;
    delete result.changesRequestedAt;
    delete result.approvedAt;
    delete result.approvedBy;
    delete result.rejectedAt;
    delete result.rejectedBy;
    delete result.archivedAt;
    delete result.archivedBy;
    delete result.publishedBy;
    delete result.revision;
  }

  return result;
}

async function uniqueArticleSlug(title, articleId) {
  const base = slugify(title, 220) || `article-${asId(articleId).slice(-12)}`;
  let candidate = base;
  let suffix = 2;

  while (
    await Article.exists({
      slug: candidate,
      _id: { $ne: articleId },
      deletedAt: null,
    })
  ) {
    candidate = `${base.slice(0, 245)}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

async function resolveTaxonomy({ categoryId, tagIds, activeOnly = true }) {
  const categoryQuery = categoryId ? { _id: categoryId } : null;
  if (categoryQuery && activeOnly) categoryQuery.status = ARTICLE_TAXONOMY_STATUSES.ACTIVE;

  const tagQuery = { _id: { $in: tagIds || [] } };
  if (activeOnly) tagQuery.status = ARTICLE_TAXONOMY_STATUSES.ACTIVE;

  const [category, tags] = await Promise.all([
    categoryQuery ? ArticleCategory.findOne(categoryQuery) : null,
    tagIds?.length ? ArticleTag.find(tagQuery).sort({ name: 1 }) : [],
  ]);

  if (categoryId && !category) {
    throw new ApiError(422, 'Select an active article category.');
  }

  if ((tagIds || []).length !== tags.length) {
    throw new ApiError(422, 'One or more selected article tags are unavailable.');
  }

  return { category, tags };
}

function applyArticleInput(article, input, taxonomy) {
  const metrics = articleMetrics(input.content);
  article.title = plainText(input.title);
  article.summary = plainText(input.summary);
  article.content = plainText(input.content);
  article.category = taxonomy.category?._id || null;
  article.categoryName = taxonomy.category?.name || '';
  article.categorySlug = taxonomy.category?.slug || '';
  article.tags = taxonomy.tags.map((tag) => tag._id);
  article.tagNames = taxonomy.tags.map((tag) => tag.name);
  article.tagSlugs = taxonomy.tags.map((tag) => tag.slug);
  article.seoTitle = plainText(input.seoTitle);
  article.seoDescription = plainText(input.seoDescription);
  article.declarationAccepted = input.declarationAccepted;
  article.wordCount = metrics.wordCount;
  article.readingMinutes = metrics.readingMinutes;
  if (article.featuredImage) {
    article.featuredImage.altText = plainText(input.imageAltText);
  }
}

function submissionErrors(article) {
  const errors = [];
  if (article.summary.length < 40) {
    errors.push({ field: 'summary', message: 'Add a summary of at least 40 characters.' });
  }
  if (article.content.length < 300) {
    errors.push({ field: 'content', message: 'Add article content of at least 300 characters.' });
  }
  if (!article.category) {
    errors.push({ field: 'categoryId', message: 'Select an article category.' });
  }
  if (article.featuredImage && !article.featuredImage.altText) {
    errors.push({
      field: 'imageAltText',
      message: 'Add alternative text for the featured image.',
    });
  }
  if (!article.declarationAccepted) {
    errors.push({
      field: 'declarationAccepted',
      message: 'Accept the article accuracy and publishing declaration.',
    });
  }
  return errors;
}

async function createReviewEntry({ article, actorId, previousStatus, newStatus, notes, context }) {
  return ArticleReview.create({
    article: article._id,
    actor: actorId,
    previousStatus,
    newStatus,
    internalNote: notes.internalNote || '',
    authorVisibleNote: notes.authorVisibleNote || '',
    ipAddress: context.ipAddress || '',
    userAgent: context.userAgent || '',
    requestId: context.requestId || '',
  });
}

async function notifyArticleModerators(article) {
  const candidates = await User.find({ accountStatus: 'active' }).select(
    'roles additionalPermissions',
  );
  const moderators = [];
  for (const candidate of candidates) {
    const permissions = await resolveUserPermissions(candidate);
    if (permissions.includes(PERMISSIONS.ARTICLE_MODERATE)) moderators.push(candidate);
  }

  await Promise.all(
    moderators.map((moderator) =>
      createNotificationSafely({
        recipient: moderator._id,
        type: NOTIFICATION_TYPES.ARTICLE_SUBMITTED,
        category: NOTIFICATION_CATEGORIES.ARTICLE,
        title: 'Article awaiting moderation',
        message: `${article.title} was submitted for content review.`,
        actionUrl: `/admin/articles/${article.id}`,
        reference: article.id,
        dedupeKey: `article-submitted-admin:${article.id}:${article.revision}`,
        createdBy: article.author,
      }),
    ),
  );
}

async function notifyAuthor(article, type, title, message) {
  await createNotificationSafely({
    recipient: article.author,
    type,
    category: NOTIFICATION_CATEGORIES.ARTICLE,
    title,
    message,
    actionUrl: `/dashboard/articles/${article.id}`,
    reference: article.id,
    dedupeKey: `${type}:${article.id}:${article.revision}:${article.status}`,
    createdBy: article.author,
  });
}

export async function listPublicArticles(filters) {
  const query = {
    status: ARTICLE_STATUSES.PUBLISHED,
    publishedAt: { $lte: new Date() },
    deletedAt: null,
  };

  if (filters.category) query.categorySlug = filters.category;
  if (filters.tag) query.tagSlugs = filters.tag;
  if (filters.author) query.authorSlug = filters.author;

  if (filters.search) {
    const matcher = new RegExp(escapeRegex(filters.search), 'i');
    query.$or = [
      { title: matcher },
      { summary: matcher },
      { authorName: matcher },
      { categoryName: matcher },
      { tagNames: matcher },
    ];
  }

  const sort = {
    latest: { publishedAt: -1, _id: -1 },
    oldest: { publishedAt: 1, _id: 1 },
    title: { title: 1, publishedAt: -1 },
  }[filters.sort];

  const skip = (filters.page - 1) * filters.limit;
  const [articles, total] = await Promise.all([
    Article.find(query).sort(sort).skip(skip).limit(filters.limit),
    Article.countDocuments(query),
  ]);

  return {
    articles: articles.map((article) => serializeArticle(article)),
    meta: {
      page: filters.page,
      limit: filters.limit,
      total,
      pages: Math.max(1, Math.ceil(total / filters.limit)),
    },
  };
}

export async function getPublicArticle(slug) {
  const article = await Article.findOne({
    slug,
    status: ARTICLE_STATUSES.PUBLISHED,
    publishedAt: { $lte: new Date() },
    deletedAt: null,
  });

  if (!article) throw new ApiError(404, 'Published article not found.');

  const relatedConditions = [];
  if (article.categorySlug) relatedConditions.push({ categorySlug: article.categorySlug });
  if (article.tagSlugs.length) relatedConditions.push({ tagSlugs: { $in: article.tagSlugs } });

  const relatedArticles = relatedConditions.length
    ? await Article.find({
        _id: { $ne: article._id },
        status: ARTICLE_STATUSES.PUBLISHED,
        publishedAt: { $lte: new Date() },
        deletedAt: null,
        $or: relatedConditions,
      })
        .sort({ publishedAt: -1, _id: -1 })
        .limit(3)
    : [];

  return {
    article: serializeArticle(article),
    relatedArticles: relatedArticles.map((item) => serializeArticle(item)),
  };
}

export async function getPublicAuthorArticles({ authorSlug, page, limit }) {
  const baseQuery = {
    authorSlug,
    status: ARTICLE_STATUSES.PUBLISHED,
    publishedAt: { $lte: new Date() },
    deletedAt: null,
  };
  const skip = (page - 1) * limit;
  const [articles, total] = await Promise.all([
    Article.find(baseQuery).sort({ publishedAt: -1 }).skip(skip).limit(limit),
    Article.countDocuments(baseQuery),
  ]);

  if (!total) throw new ApiError(404, 'Published article author not found.');

  return {
    author: {
      name: articles[0]?.authorName || '',
      slug: authorSlug,
      type: articles[0]?.authorType || '',
    },
    articles: articles.map((article) => serializeArticle(article)),
    meta: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  };
}

export async function listPublicTaxonomy() {
  const [categories, tags] = await Promise.all([
    ArticleCategory.aggregate([
      { $match: { status: ARTICLE_TAXONOMY_STATUSES.ACTIVE } },
      {
        $lookup: {
          from: 'articles',
          let: { slug: '$slug' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$categorySlug', '$$slug'] },
                status: ARTICLE_STATUSES.PUBLISHED,
                publishedAt: { $lte: new Date() },
                deletedAt: null,
              },
            },
            { $count: 'count' },
          ],
          as: 'usage',
        },
      },
      {
        $project: {
          name: 1,
          slug: 1,
          description: 1,
          seoTitle: 1,
          seoDescription: 1,
          articleCount: { $ifNull: [{ $first: '$usage.count' }, 0] },
        },
      },
      { $sort: { name: 1 } },
    ]),
    ArticleTag.aggregate([
      { $match: { status: ARTICLE_TAXONOMY_STATUSES.ACTIVE } },
      {
        $lookup: {
          from: 'articles',
          let: { slug: '$slug' },
          pipeline: [
            {
              $match: {
                $expr: { $in: ['$$slug', { $ifNull: ['$tagSlugs', []] }] },
                status: ARTICLE_STATUSES.PUBLISHED,
                publishedAt: { $lte: new Date() },
                deletedAt: null,
              },
            },
            { $count: 'count' },
          ],
          as: 'usage',
        },
      },
      {
        $project: {
          name: 1,
          slug: 1,
          articleCount: { $ifNull: [{ $first: '$usage.count' }, 0] },
        },
      },
      { $sort: { name: 1 } },
    ]),
  ]);

  return {
    categories: categories.map((item) => ({ ...item, id: asId(item._id), _id: undefined })),
    tags: tags.map((item) => ({ ...item, id: asId(item._id), _id: undefined })),
  };
}

export async function openPublicArticleImage(articleId) {
  const article = await Article.findOne({
    _id: articleId,
    status: ARTICLE_STATUSES.PUBLISHED,
    publishedAt: { $lte: new Date() },
    featuredImage: { $ne: null },
    deletedAt: null,
  });
  if (!article?.featuredImage) throw new ApiError(404, 'Article image not found.');
  return { article, asset: await openDocumentAsset(article.featuredImage) };
}

export async function listEligibleAuthorMemberships(ownerId) {
  const memberships = await Membership.find({
    owner: ownerId,
    type: { $in: ARTICLE_AUTHOR_TYPE_VALUES },
    status: { $in: [MEMBERSHIP_STATUSES.ACTIVE, MEMBERSHIP_STATUSES.RENEWAL_DUE] },
    validUntil: { $gte: new Date() },
  }).sort({ approvedName: 1 });
  return memberships.map((membership) => membership.toJSON());
}

export async function listSelfArticles({ ownerId, filters }) {
  const query = { author: ownerId, deletedAt: null };
  if (filters.status) query.status = filters.status;
  if (filters.search) {
    const matcher = new RegExp(escapeRegex(filters.search), 'i');
    query.$or = [{ title: matcher }, { summary: matcher }, { categoryName: matcher }];
  }
  const skip = (filters.page - 1) * filters.limit;
  const [articles, total] = await Promise.all([
    Article.find(query).sort({ updatedAt: -1 }).skip(skip).limit(filters.limit),
    Article.countDocuments(query),
  ]);
  return {
    articles: articles.map((article) =>
      serializeArticle(article, { includePrivate: true, imageKind: 'self' }),
    ),
    meta: {
      page: filters.page,
      limit: filters.limit,
      total,
      pages: Math.max(1, Math.ceil(total / filters.limit)),
    },
  };
}

export async function createArticleDraft({ ownerId, input }) {
  const membership = await eligibleMembership({
    membershipId: input.authorMembershipId,
    ownerId,
  });
  const identity = await authorIdentity(membership);
  const article = await Article.create({
    author: ownerId,
    authorMembership: membership._id,
    authorType: membership.type,
    authorName: identity.authorName,
    authorSlug: identity.authorSlug,
    title: plainText(input.title),
    status: ARTICLE_STATUSES.DRAFT,
  });
  return serializeArticle(article, { includePrivate: true, imageKind: 'self' });
}

async function selfArticle(articleId, ownerId) {
  const article = await Article.findOne({
    _id: articleId,
    author: ownerId,
    deletedAt: null,
  });
  if (!article) throw new ApiError(404, 'Article record not found.');
  return article;
}

export async function getSelfArticle({ articleId, ownerId }) {
  const article = await selfArticle(articleId, ownerId);
  const history = await ArticleReview.find({ article: article._id })
    .populate('actor', 'displayName')
    .sort({ createdAt: -1 });
  return {
    article: serializeArticle(article, { includePrivate: true, imageKind: 'self' }),
    history: history.map((entry) => entry.toJSON()),
  };
}

export async function updateSelfArticle({ articleId, ownerId, input }) {
  const article = await selfArticle(articleId, ownerId);
  if (!ARTICLE_EDITABLE_STATUSES.includes(article.status)) {
    throw new ApiError(409, 'This article cannot be edited in its current status.');
  }
  await eligibleMembership({ membershipId: article.authorMembership, ownerId });
  const taxonomy = await resolveTaxonomy({
    categoryId: input.categoryId,
    tagIds: input.tagIds,
  });
  applyArticleInput(article, input, taxonomy);
  article.revision += 1;
  await article.save();
  return serializeArticle(article, { includePrivate: true, imageKind: 'self' });
}

export async function uploadArticleImage({ articleId, ownerId, file, altText }) {
  const article = await selfArticle(articleId, ownerId);
  if (!ARTICLE_EDITABLE_STATUSES.includes(article.status)) {
    throw new ApiError(409, 'This article image cannot be changed in its current status.');
  }
  if (!file?.mimetype?.startsWith('image/')) {
    throw new ApiError(415, 'Upload a JPG, JPEG, PNG, or WEBP image.');
  }

  const stored = await storeDocumentAsset({
    file,
    ownerId,
    applicationId: article._id,
  });
  const previous = article.featuredImage ? article.featuredImage.toObject() : null;
  article.featuredImage = { ...stored, altText: plainText(altText), uploadedAt: new Date() };
  await article.save();
  if (previous) await deleteDocumentAsset(previous).catch(() => {});
  return serializeArticle(article, { includePrivate: true, imageKind: 'self' });
}

export async function removeArticleImage({ articleId, ownerId }) {
  const article = await selfArticle(articleId, ownerId);
  if (!ARTICLE_EDITABLE_STATUSES.includes(article.status)) {
    throw new ApiError(409, 'This article image cannot be changed in its current status.');
  }
  const previous = article.featuredImage ? article.featuredImage.toObject() : null;
  article.featuredImage = null;
  await article.save();
  if (previous) await deleteDocumentAsset(previous).catch(() => {});
  return serializeArticle(article, { includePrivate: true, imageKind: 'self' });
}

export async function openSelfArticleImage({ articleId, ownerId }) {
  const article = await selfArticle(articleId, ownerId);
  if (!article.featuredImage) throw new ApiError(404, 'Article image not found.');
  return { article, asset: await openDocumentAsset(article.featuredImage) };
}

export async function deleteSelfArticle({ articleId, ownerId }) {
  const article = await selfArticle(articleId, ownerId);
  if (article.status !== ARTICLE_STATUSES.DRAFT) {
    throw new ApiError(409, 'Only article drafts can be deleted.');
  }
  const image = article.featuredImage ? article.featuredImage.toObject() : null;
  article.deletedAt = new Date();
  await article.save();
  if (image) await deleteDocumentAsset(image).catch(() => {});
}

export async function submitArticle({ articleId, ownerId, context }) {
  const article = await selfArticle(articleId, ownerId);
  if (!ARTICLE_EDITABLE_STATUSES.includes(article.status)) {
    throw new ApiError(409, 'This article cannot be submitted in its current status.');
  }
  await eligibleMembership({ membershipId: article.authorMembership, ownerId });
  const errors = submissionErrors(article);
  if (errors.length) {
    throw new ApiError(422, 'Complete the article before submission.', errors);
  }
  const previousStatus = article.status;
  article.status = ARTICLE_STATUSES.SUBMITTED;
  article.submittedAt = new Date();
  article.latestAuthorVisibleNote = '';
  await article.save();
  await createReviewEntry({
    article,
    actorId: ownerId,
    previousStatus,
    newStatus: article.status,
    notes: {},
    context,
  });
  await notifyArticleModerators(article);
  await notifyAuthor(
    article,
    NOTIFICATION_TYPES.ARTICLE_SUBMITTED,
    'Article submitted',
    `${article.title} was submitted for moderation.`,
  );
  return serializeArticle(article, { includePrivate: true, imageKind: 'self' });
}

export async function listArticleModerators() {
  const candidates = await User.find({ accountStatus: 'active' }).select(
    'firstName lastName displayName email roles additionalPermissions',
  );
  const moderators = [];
  for (const candidate of candidates) {
    const permissions = await resolveUserPermissions(candidate);
    if (!permissions.includes(PERMISSIONS.ARTICLE_MODERATE)) continue;
    moderators.push({
      id: candidate.id,
      displayName:
        candidate.displayName ||
        `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim() ||
        candidate.email,
      email: candidate.email,
    });
  }
  return moderators;
}

export async function listAdminArticles({ filters, actor }) {
  const query = { deletedAt: null };
  if (filters.status) query.status = filters.status;
  if (filters.category) query.categorySlug = filters.category;
  if (filters.assignment === 'mine') query.assignedModerator = actor.userId;
  if (filters.assignment === 'unassigned') query.assignedModerator = null;
  if (filters.search) {
    const matcher = new RegExp(escapeRegex(filters.search), 'i');
    query.$or = [
      { title: matcher },
      { authorName: matcher },
      { categoryName: matcher },
      { tagNames: matcher },
    ];
  }
  const skip = (filters.page - 1) * filters.limit;
  const [articles, total] = await Promise.all([
    Article.find(query)
      .populate('assignedModerator', 'displayName email')
      .sort({ submittedAt: 1, updatedAt: -1 })
      .skip(skip)
      .limit(filters.limit),
    Article.countDocuments(query),
  ]);
  return {
    articles: articles.map((article) =>
      serializeArticle(article, { includePrivate: true, imageKind: 'admin' }),
    ),
    meta: {
      page: filters.page,
      limit: filters.limit,
      total,
      pages: Math.max(1, Math.ceil(total / filters.limit)),
    },
  };
}

export async function getAdminArticle(articleId) {
  const article = await Article.findOne({ _id: articleId, deletedAt: null })
    .populate('author', 'displayName email')
    .populate('authorMembership', 'approvedName registrationNumber type status validUntil')
    .populate('assignedModerator', 'displayName email');
  if (!article) throw new ApiError(404, 'Article record not found.');
  const history = await ArticleReview.find({ article: article._id })
    .populate('actor', 'displayName email')
    .sort({ createdAt: -1 });
  return {
    article: serializeArticle(article, { includePrivate: true, imageKind: 'admin' }),
    history: history.map((entry) => entry.toJSON()),
  };
}

export async function openAdminArticleImage(articleId) {
  const article = await Article.findOne({
    _id: articleId,
    featuredImage: { $ne: null },
    deletedAt: null,
  });
  if (!article?.featuredImage) throw new ApiError(404, 'Article image not found.');
  return { article, asset: await openDocumentAsset(article.featuredImage) };
}

export async function assignArticleModerator({ articleId, actor, moderatorId, context }) {
  const article = await Article.findOne({ _id: articleId, deletedAt: null });
  if (!article) throw new ApiError(404, 'Article record not found.');

  let moderator = null;
  if (moderatorId) {
    moderator = await User.findOne({ _id: moderatorId, accountStatus: 'active' });
    const permissions = moderator ? await resolveUserPermissions(moderator) : [];
    if (!moderator || !permissions.includes(PERMISSIONS.ARTICLE_MODERATE)) {
      throw new ApiError(422, 'Select an active article moderator.');
    }
  }

  const previous = article.assignedModerator;
  article.assignedModerator = moderator?._id || null;
  if (
    moderator &&
    article.status === ARTICLE_STATUSES.SUBMITTED
  ) {
    const previousStatus = article.status;
    article.status = ARTICLE_STATUSES.UNDER_REVIEW;
    article.reviewStartedAt = new Date();
    await createReviewEntry({
      article,
      actorId: actor.userId,
      previousStatus,
      newStatus: article.status,
      notes: { authorVisibleNote: 'Editorial review has started.' },
      context,
    });
  }
  await article.save();

  await recordSuccessfulAudit(
    {
      action: AUDIT_ACTIONS.ARTICLE_MODERATOR_ASSIGNED,
      actor,
      entityType: AUDIT_ENTITY_TYPES.ARTICLE,
      entityId: article.id,
      subjectUser: article.author,
      previousValues: { assignedModerator: previous ? asId(previous) : null },
      context,
    },
    { assignedModerator: moderator?.id || null, status: article.status },
  );

  return serializeArticle(article, { includePrivate: true, imageKind: 'admin' });
}

async function changeArticleStatus({ articleId, actor, action, input, context }) {
  const article = await Article.findOne({ _id: articleId, deletedAt: null });
  if (!article) throw new ApiError(404, 'Article record not found.');

  const transition = {
    request_changes: {
      confirmation: 'REQUEST CHANGES',
      from: [ARTICLE_STATUSES.SUBMITTED, ARTICLE_STATUSES.UNDER_REVIEW],
      to: ARTICLE_STATUSES.CHANGES_REQUESTED,
      audit: AUDIT_ACTIONS.ARTICLE_CHANGES_REQUESTED,
      notification: NOTIFICATION_TYPES.ARTICLE_CHANGES_REQUESTED,
      title: 'Article changes requested',
      requiresVisibleNote: true,
    },
    approve: {
      confirmation: 'APPROVE',
      from: [ARTICLE_STATUSES.SUBMITTED, ARTICLE_STATUSES.UNDER_REVIEW],
      to: ARTICLE_STATUSES.APPROVED,
      audit: AUDIT_ACTIONS.ARTICLE_APPROVED,
      notification: NOTIFICATION_TYPES.ARTICLE_APPROVED,
      title: 'Article approved',
    },
    publish: {
      confirmation: 'PUBLISH',
      from: [ARTICLE_STATUSES.APPROVED],
      to: ARTICLE_STATUSES.PUBLISHED,
      audit: AUDIT_ACTIONS.ARTICLE_PUBLISHED,
      notification: NOTIFICATION_TYPES.ARTICLE_PUBLISHED,
      title: 'Article published',
    },
    reject: {
      confirmation: 'REJECT',
      from: [ARTICLE_STATUSES.SUBMITTED, ARTICLE_STATUSES.UNDER_REVIEW],
      to: ARTICLE_STATUSES.REJECTED,
      audit: AUDIT_ACTIONS.ARTICLE_REJECTED,
      notification: NOTIFICATION_TYPES.ARTICLE_REJECTED,
      title: 'Article rejected',
      requiresVisibleNote: true,
    },
    archive: {
      confirmation: 'ARCHIVE',
      from: [ARTICLE_STATUSES.APPROVED, ARTICLE_STATUSES.PUBLISHED, ARTICLE_STATUSES.REJECTED],
      to: ARTICLE_STATUSES.ARCHIVED,
      audit: AUDIT_ACTIONS.ARTICLE_ARCHIVED,
      notification: NOTIFICATION_TYPES.ARTICLE_ARCHIVED,
      title: 'Article archived',
    },
    restore: {
      confirmation: 'RESTORE',
      from: [ARTICLE_STATUSES.ARCHIVED],
      to: ARTICLE_STATUSES.APPROVED,
      audit: AUDIT_ACTIONS.ARTICLE_RESTORED,
      notification: NOTIFICATION_TYPES.ARTICLE_APPROVED,
      title: 'Article restored',
    },
  }[action];

  if (!transition) throw new ApiError(422, 'Unsupported article action.');
  if (input.confirmation !== transition.confirmation) {
    throw new ApiError(422, `Type ${transition.confirmation} to confirm this action.`);
  }
  if (!transition.from.includes(article.status)) {
    throw new ApiError(409, 'This article action is not available in the current status.');
  }
  if (transition.requiresVisibleNote && input.authorVisibleNote.length < 10) {
    throw new ApiError(422, 'Add an author-visible explanation of at least 10 characters.');
  }

  const previousStatus = article.status;
  article.status = transition.to;
  article.latestAuthorVisibleNote = input.authorVisibleNote || '';

  const now = new Date();
  if (action === 'request_changes') article.changesRequestedAt = now;
  if (action === 'approve') {
    article.approvedAt = now;
    article.approvedBy = actor.userId;
  }
  if (action === 'publish') {
    article.slug ||= await uniqueArticleSlug(article.title, article._id);
    article.publishedAt = input.publishAt ? new Date(input.publishAt) : now;
    article.publishedBy = actor.userId;
    article.archivedAt = null;
    article.archivedBy = null;
  }
  if (action === 'reject') {
    article.rejectedAt = now;
    article.rejectedBy = actor.userId;
  }
  if (action === 'archive') {
    article.archivedAt = now;
    article.archivedBy = actor.userId;
  }
  if (action === 'restore') {
    article.archivedAt = null;
    article.archivedBy = null;
  }

  await article.save();
  await createReviewEntry({
    article,
    actorId: actor.userId,
    previousStatus,
    newStatus: article.status,
    notes: input,
    context,
  });
  await recordSuccessfulAudit(
    {
      action: transition.audit,
      actor,
      entityType: AUDIT_ENTITY_TYPES.ARTICLE,
      entityId: article.id,
      subjectUser: article.author,
      reason: input.reason || input.authorVisibleNote || transition.title,
      previousValues: { status: previousStatus },
      context,
    },
    { status: article.status, publishedAt: article.publishedAt },
  );
  await notifyAuthor(
    article,
    transition.notification,
    transition.title,
    input.authorVisibleNote || `${article.title} is now ${article.status.replaceAll('_', ' ')}.`,
  );
  return serializeArticle(article, { includePrivate: true, imageKind: 'admin' });
}

export function requestArticleChanges(input) {
  return changeArticleStatus({ ...input, action: 'request_changes' });
}
export function approveArticle(input) {
  return changeArticleStatus({ ...input, action: 'approve' });
}
export function publishArticle(input) {
  return changeArticleStatus({ ...input, action: 'publish' });
}
export function rejectArticle(input) {
  return changeArticleStatus({ ...input, action: 'reject' });
}
export function archiveArticle(input) {
  return changeArticleStatus({ ...input, action: 'archive' });
}
export function restoreArticle(input) {
  return changeArticleStatus({ ...input, action: 'restore' });
}

export async function listAdminTaxonomy({ includeArchived }) {
  const query = includeArchived ? {} : { status: ARTICLE_TAXONOMY_STATUSES.ACTIVE };
  const [categories, tags] = await Promise.all([
    ArticleCategory.find(query).sort({ name: 1 }),
    ArticleTag.find(query).sort({ name: 1 }),
  ]);
  return {
    categories: categories.map((item) => item.toJSON()),
    tags: tags.map((item) => item.toJSON()),
  };
}

async function uniqueTaxonomySlug(Model, name, currentId = null) {
  const base = slugify(name, 120);
  if (!base) throw new ApiError(422, 'A valid taxonomy name is required.');
  let candidate = base;
  let suffix = 2;
  while (await Model.exists({ slug: candidate, _id: { $ne: currentId } })) {
    candidate = `${base.slice(0, 110)}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

export async function createArticleCategory({ actor, input, context }) {
  const slug = await uniqueTaxonomySlug(ArticleCategory, input.name);
  const category = await ArticleCategory.create({
    ...input,
    slug,
    createdBy: actor.userId,
    updatedBy: actor.userId,
  });
  await recordSuccessfulAudit(
    {
      action: AUDIT_ACTIONS.ARTICLE_CATEGORY_CREATED,
      actor,
      entityType: AUDIT_ENTITY_TYPES.ARTICLE_CATEGORY,
      entityId: category.id,
      context,
    },
    category.toJSON(),
  );
  return category.toJSON();
}

export async function updateArticleCategory({ categoryId, actor, input, context }) {
  const category = await ArticleCategory.findById(categoryId);
  if (!category) throw new ApiError(404, 'Article category not found.');
  const previous = category.toJSON();
  category.name = input.name;
  category.description = input.description;
  category.status = input.status;
  category.seoTitle = input.seoTitle;
  category.seoDescription = input.seoDescription;
  category.updatedBy = actor.userId;
  await category.save();
  await recordSuccessfulAudit(
    {
      action: AUDIT_ACTIONS.ARTICLE_CATEGORY_UPDATED,
      actor,
      entityType: AUDIT_ENTITY_TYPES.ARTICLE_CATEGORY,
      entityId: category.id,
      previousValues: previous,
      context,
    },
    category.toJSON(),
  );
  return category.toJSON();
}

export async function createArticleTag({ actor, input, context }) {
  const slug = await uniqueTaxonomySlug(ArticleTag, input.name);
  const tag = await ArticleTag.create({
    ...input,
    slug,
    createdBy: actor.userId,
    updatedBy: actor.userId,
  });
  await recordSuccessfulAudit(
    {
      action: AUDIT_ACTIONS.ARTICLE_TAG_CREATED,
      actor,
      entityType: AUDIT_ENTITY_TYPES.ARTICLE_TAG,
      entityId: tag.id,
      context,
    },
    tag.toJSON(),
  );
  return tag.toJSON();
}

export async function updateArticleTag({ tagId, actor, input, context }) {
  const tag = await ArticleTag.findById(tagId);
  if (!tag) throw new ApiError(404, 'Article tag not found.');
  const previous = tag.toJSON();
  tag.name = input.name;
  tag.status = input.status;
  tag.updatedBy = actor.userId;
  await tag.save();
  await recordSuccessfulAudit(
    {
      action: AUDIT_ACTIONS.ARTICLE_TAG_UPDATED,
      actor,
      entityType: AUDIT_ENTITY_TYPES.ARTICLE_TAG,
      entityId: tag.id,
      previousValues: previous,
      context,
    },
    tag.toJSON(),
  );
  return tag.toJSON();
}
