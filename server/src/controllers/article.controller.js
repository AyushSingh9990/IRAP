import {
  approveArticle,
  archiveArticle,
  assignArticleModerator,
  createArticleCategory,
  createArticleDraft,
  createArticleTag,
  deleteSelfArticle,
  getAdminArticle,
  getPublicArticle,
  getPublicAuthorArticles,
  getSelfArticle,
  listAdminArticles,
  listAdminTaxonomy,
  listArticleModerators,
  listEligibleAuthorMemberships,
  listPublicArticles,
  listPublicTaxonomy,
  listSelfArticles,
  openAdminArticleImage,
  openPublicArticleImage,
  openSelfArticleImage,
  publishArticle,
  rejectArticle,
  removeArticleImage,
  requestArticleChanges,
  restoreArticle,
  submitArticle,
  updateArticleCategory,
  updateArticleTag,
  updateSelfArticle,
  uploadArticleImage,
} from '../services/article.service.js';
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

function contentDisposition(filename) {
  const safeName = String(filename || 'article-image')
    .replace(/[^\x20-\x7e]/g, '_')
    .replace(/["\\]/g, '_');
  return `inline; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(
    filename || 'article-image',
  )}`;
}

function streamImage(response, next, article, asset, { isPublic = false } = {}) {
  response.setHeader('Content-Type', article.featuredImage.mimeType);
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Content-Disposition', contentDisposition(article.featuredImage.originalFilename));
  response.setHeader(
    'Cache-Control',
    isPublic ? 'public, max-age=3600, must-revalidate' : 'private, no-store',
  );
  if (asset.contentLength) response.setHeader('Content-Length', asset.contentLength);
  asset.stream.on('error', next);
  asset.stream.pipe(response);
}

export const publicArticles = asyncHandler(async (request, response) => {
  const result = await listPublicArticles(request.validated.query);
  response.status(200).json(
    new ApiResponse({
      message: 'Published articles loaded.',
      data: { articles: result.articles },
      meta: result.meta,
    }),
  );
});

export const publicArticle = asyncHandler(async (request, response) => {
  const result = await getPublicArticle(request.validated.params.slug);
  response.status(200).json(
    new ApiResponse({
      message: 'Published article loaded.',
      data: result,
    }),
  );
});

export const publicAuthor = asyncHandler(async (request, response) => {
  const result = await getPublicAuthorArticles({
    authorSlug: request.validated.params.authorSlug,
    page: request.validated.query.page,
    limit: request.validated.query.limit,
  });
  response.status(200).json(
    new ApiResponse({
      message: 'Author articles loaded.',
      data: { author: result.author, articles: result.articles },
      meta: result.meta,
    }),
  );
});

export const publicTaxonomy = asyncHandler(async (_request, response) => {
  const taxonomy = await listPublicTaxonomy();
  response.status(200).json(
    new ApiResponse({
      message: 'Article categories and tags loaded.',
      data: taxonomy,
    }),
  );
});

export const publicImage = asyncHandler(async (request, response, next) => {
  const { article, asset } = await openPublicArticleImage(
    request.validated.params.articleId,
  );
  streamImage(response, next, article, asset, { isPublic: true });
});

export const authorMemberships = asyncHandler(async (request, response) => {
  const memberships = await listEligibleAuthorMemberships(request.auth.userId);
  response.status(200).json(
    new ApiResponse({
      message: 'Eligible article author records loaded.',
      data: { memberships },
    }),
  );
});

export const myArticles = asyncHandler(async (request, response) => {
  const result = await listSelfArticles({
    ownerId: request.auth.userId,
    filters: request.validated.query,
  });
  response.status(200).json(
    new ApiResponse({
      message: 'Your articles loaded.',
      data: { articles: result.articles },
      meta: result.meta,
    }),
  );
});

export const createArticle = asyncHandler(async (request, response) => {
  const article = await createArticleDraft({
    ownerId: request.auth.userId,
    input: request.validated.body,
  });
  response.status(201).json(
    new ApiResponse({
      message: 'Article draft created.',
      data: { article },
    }),
  );
});

export const myArticle = asyncHandler(async (request, response) => {
  const result = await getSelfArticle({
    articleId: request.validated.params.articleId,
    ownerId: request.auth.userId,
  });
  response.status(200).json(
    new ApiResponse({
      message: 'Article workspace loaded.',
      data: result,
    }),
  );
});

export const saveArticle = asyncHandler(async (request, response) => {
  const article = await updateSelfArticle({
    articleId: request.validated.params.articleId,
    ownerId: request.auth.userId,
    input: request.validated.body,
  });
  response.status(200).json(
    new ApiResponse({
      message: 'Article draft saved.',
      data: { article },
    }),
  );
});

export const submitMyArticle = asyncHandler(async (request, response) => {
  const article = await submitArticle({
    articleId: request.validated.params.articleId,
    ownerId: request.auth.userId,
    context: contextFromRequest(request),
  });
  response.status(200).json(
    new ApiResponse({
      message: 'Article submitted for moderation.',
      data: { article },
    }),
  );
});

export const uploadFeaturedImage = asyncHandler(async (request, response) => {
  const article = await uploadArticleImage({
    articleId: request.validated.params.articleId,
    ownerId: request.auth.userId,
    file: request.file,
    altText: request.validated.body.altText,
  });
  response.status(201).json(
    new ApiResponse({
      message: 'Featured image uploaded.',
      data: { article },
    }),
  );
});

export const removeFeaturedImage = asyncHandler(async (request, response) => {
  const article = await removeArticleImage({
    articleId: request.validated.params.articleId,
    ownerId: request.auth.userId,
  });
  response.status(200).json(
    new ApiResponse({
      message: 'Featured image removed.',
      data: { article },
    }),
  );
});

export const myFeaturedImage = asyncHandler(async (request, response, next) => {
  const { article, asset } = await openSelfArticleImage({
    articleId: request.validated.params.articleId,
    ownerId: request.auth.userId,
  });
  streamImage(response, next, article, asset);
});

export const deleteArticle = asyncHandler(async (request, response) => {
  await deleteSelfArticle({
    articleId: request.validated.params.articleId,
    ownerId: request.auth.userId,
  });
  response.status(200).json(
    new ApiResponse({ message: 'Article draft deleted.', data: null }),
  );
});

export const adminArticles = asyncHandler(async (request, response) => {
  const result = await listAdminArticles({
    filters: request.validated.query,
    actor: actorFromRequest(request),
  });
  response.status(200).json(
    new ApiResponse({
      message: 'Article moderation queue loaded.',
      data: { articles: result.articles },
      meta: result.meta,
    }),
  );
});

export const adminArticle = asyncHandler(async (request, response) => {
  const result = await getAdminArticle(request.validated.params.articleId);
  response.status(200).json(
    new ApiResponse({
      message: 'Article moderation workspace loaded.',
      data: result,
    }),
  );
});

export const adminModerators = asyncHandler(async (_request, response) => {
  const moderators = await listArticleModerators();
  response.status(200).json(
    new ApiResponse({
      message: 'Article moderators loaded.',
      data: { moderators },
    }),
  );
});

export const assignModerator = asyncHandler(async (request, response) => {
  const article = await assignArticleModerator({
    articleId: request.validated.params.articleId,
    actor: actorFromRequest(request),
    moderatorId: request.validated.body.moderatorId,
    context: contextFromRequest(request),
  });
  response.status(200).json(
    new ApiResponse({
      message: request.validated.body.moderatorId
        ? 'Article moderator assigned.'
        : 'Article moderator removed.',
      data: { article },
    }),
  );
});

function decisionHandler(service, message) {
  return asyncHandler(async (request, response) => {
    const article = await service({
      articleId: request.validated.params.articleId,
      actor: actorFromRequest(request),
      input: request.validated.body,
      context: contextFromRequest(request),
    });
    response.status(200).json(
      new ApiResponse({ message, data: { article } }),
    );
  });
}

export const requestChanges = decisionHandler(
  requestArticleChanges,
  'Article changes requested.',
);
export const approve = decisionHandler(approveArticle, 'Article approved.');
export const publish = decisionHandler(publishArticle, 'Article published.');
export const reject = decisionHandler(rejectArticle, 'Article rejected.');
export const archive = decisionHandler(archiveArticle, 'Article archived.');
export const restore = decisionHandler(restoreArticle, 'Article restored to approved status.');

export const adminFeaturedImage = asyncHandler(async (request, response, next) => {
  const { article, asset } = await openAdminArticleImage(
    request.validated.params.articleId,
  );
  streamImage(response, next, article, asset);
});

export const adminTaxonomy = asyncHandler(async (request, response) => {
  const taxonomy = await listAdminTaxonomy(request.validated.query);
  response.status(200).json(
    new ApiResponse({
      message: 'Article taxonomy loaded.',
      data: taxonomy,
    }),
  );
});

export const createCategory = asyncHandler(async (request, response) => {
  const category = await createArticleCategory({
    actor: actorFromRequest(request),
    input: request.validated.body,
    context: contextFromRequest(request),
  });
  response.status(201).json(
    new ApiResponse({
      message: 'Article category created.',
      data: { category },
    }),
  );
});

export const updateCategory = asyncHandler(async (request, response) => {
  const category = await updateArticleCategory({
    categoryId: request.validated.params.categoryId,
    actor: actorFromRequest(request),
    input: request.validated.body,
    context: contextFromRequest(request),
  });
  response.status(200).json(
    new ApiResponse({
      message: 'Article category updated.',
      data: { category },
    }),
  );
});

export const createTag = asyncHandler(async (request, response) => {
  const tag = await createArticleTag({
    actor: actorFromRequest(request),
    input: request.validated.body,
    context: contextFromRequest(request),
  });
  response.status(201).json(
    new ApiResponse({ message: 'Article tag created.', data: { tag } }),
  );
});

export const updateTag = asyncHandler(async (request, response) => {
  const tag = await updateArticleTag({
    tagId: request.validated.params.tagId,
    actor: actorFromRequest(request),
    input: request.validated.body,
    context: contextFromRequest(request),
  });
  response.status(200).json(
    new ApiResponse({ message: 'Article tag updated.', data: { tag } }),
  );
});
