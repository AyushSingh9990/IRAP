import axiosInstance from './axiosInstance.js';

function compactQueryParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => {
      if (value === undefined || value === null || value === '') return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    }),
  );
}

export async function listPublishedArticles(params = {}) {
  const response = await axiosInstance.get('/articles', { params: compactQueryParams(params) });
  return response.data;
}

export async function getPublishedArticle(slug) {
  const response = await axiosInstance.get(`/articles/public/${slug}`);
  return response.data;
}

export async function getPublishedAuthor(authorSlug, params = {}) {
  const response = await axiosInstance.get(`/articles/authors/${authorSlug}`, {
    params: compactQueryParams(params),
  });
  return response.data;
}

export async function getArticleTaxonomy() {
  const response = await axiosInstance.get('/articles/taxonomy');
  return response.data;
}

export async function listArticleAuthorMemberships() {
  const response = await axiosInstance.get('/articles/self/author-memberships');
  return response.data;
}

export async function listMyArticles(params = {}) {
  const response = await axiosInstance.get('/articles/self', { params: compactQueryParams(params) });
  return response.data;
}

export async function createArticle(payload) {
  const response = await axiosInstance.post('/articles/self', payload);
  return response.data;
}

export async function getMyArticle(articleId) {
  const response = await axiosInstance.get(`/articles/self/${articleId}`);
  return response.data;
}

export async function saveMyArticle(articleId, payload) {
  const response = await axiosInstance.patch(`/articles/self/${articleId}`, payload);
  return response.data;
}

export async function submitMyArticle(articleId) {
  const response = await axiosInstance.post(`/articles/self/${articleId}/submit`, {
    confirmation: 'SUBMIT',
  });
  return response.data;
}

export async function deleteMyArticle(articleId) {
  const response = await axiosInstance.delete(`/articles/self/${articleId}`);
  return response.data;
}

export async function uploadMyArticleImage(articleId, file, altText = '') {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('altText', altText);
  const response = await axiosInstance.post(
    `/articles/self/${articleId}/featured-image`,
    formData,
  );
  return response.data;
}

export async function removeMyArticleImage(articleId) {
  const response = await axiosInstance.delete(
    `/articles/self/${articleId}/featured-image`,
  );
  return response.data;
}

export async function getMyArticleImage(articleId) {
  const response = await axiosInstance.get(
    `/articles/self/${articleId}/featured-image/content`,
    { responseType: 'blob' },
  );
  return response.data;
}

export async function listAdminArticles(params = {}) {
  const response = await axiosInstance.get('/articles/admin/queue', { params: compactQueryParams(params) });
  return response.data;
}

export async function getAdminArticle(articleId) {
  const response = await axiosInstance.get(`/articles/admin/${articleId}`);
  return response.data;
}

export async function listArticleModerators() {
  const response = await axiosInstance.get('/articles/admin/moderators');
  return response.data;
}

export async function assignArticleModerator(articleId, moderatorId) {
  const response = await axiosInstance.patch(
    `/articles/admin/${articleId}/assignment`,
    { moderatorId: moderatorId || null },
  );
  return response.data;
}

async function articleDecision(articleId, action, payload) {
  const response = await axiosInstance.post(
    `/articles/admin/${articleId}/${action}`,
    payload,
  );
  return response.data;
}

export function requestArticleChanges(articleId, payload) {
  return articleDecision(articleId, 'request-changes', {
    ...payload,
    confirmation: 'REQUEST CHANGES',
  });
}

export function approveArticle(articleId, payload) {
  return articleDecision(articleId, 'approve', {
    ...payload,
    confirmation: 'APPROVE',
  });
}

export function publishArticle(articleId, payload) {
  return articleDecision(articleId, 'publish', {
    ...payload,
    publishAt: payload.publishAt
      ? new Date(payload.publishAt).toISOString()
      : '',
    confirmation: 'PUBLISH',
  });
}

export function rejectArticle(articleId, payload) {
  return articleDecision(articleId, 'reject', {
    ...payload,
    confirmation: 'REJECT',
  });
}

export function archiveArticle(articleId, payload) {
  return articleDecision(articleId, 'archive', {
    ...payload,
    confirmation: 'ARCHIVE',
  });
}

export function restoreArticle(articleId, payload) {
  return articleDecision(articleId, 'restore', {
    ...payload,
    confirmation: 'RESTORE',
  });
}

export async function getAdminArticleTaxonomy(includeArchived = true) {
  const response = await axiosInstance.get('/articles/admin/taxonomy', {
    params: { includeArchived },
  });
  return response.data;
}

export async function createArticleCategory(payload) {
  const response = await axiosInstance.post('/articles/admin/categories', payload);
  return response.data;
}

export async function updateArticleCategory(categoryId, payload) {
  const response = await axiosInstance.patch(
    `/articles/admin/categories/${categoryId}`,
    payload,
  );
  return response.data;
}

export async function createArticleTag(payload) {
  const response = await axiosInstance.post('/articles/admin/tags', payload);
  return response.data;
}

export async function updateArticleTag(tagId, payload) {
  const response = await axiosInstance.patch(
    `/articles/admin/tags/${tagId}`,
    payload,
  );
  return response.data;
}
