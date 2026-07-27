import axiosInstance from './axiosInstance.js';

function compact(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value !== undefined && value !== null),
  );
}

export async function listSiteSettings(params = {}) {
  const response = await axiosInstance.get('/admin/settings', { params: compact(params) });
  return response.data;
}

export async function saveSiteSetting(key, payload) {
  const response = await axiosInstance.put(`/admin/settings/${encodeURIComponent(key)}`, payload);
  return response.data;
}

export async function listContentPages(params = {}) {
  const response = await axiosInstance.get('/admin/content-pages', { params: compact(params) });
  return response.data;
}

export async function createContentPage(payload) {
  const response = await axiosInstance.post('/admin/content-pages', payload);
  return response.data;
}

export async function updateContentPage(pageId, payload) {
  const response = await axiosInstance.patch(`/admin/content-pages/${pageId}`, payload);
  return response.data;
}

export async function listTemplates(params = {}) {
  const response = await axiosInstance.get('/admin/templates', { params: compact(params) });
  return response.data;
}

export async function createTemplate(type, payload) {
  const response = await axiosInstance.post(`/admin/templates/${type}`, payload);
  return response.data;
}

export async function updateTemplate(type, templateId, payload) {
  const response = await axiosInstance.patch(`/admin/templates/${type}/${templateId}`, payload);
  return response.data;
}

export async function listSupportQueue(params = {}) {
  const response = await axiosInstance.get('/admin/support', { params: compact(params) });
  return response.data;
}

export async function listSupportAssignees() {
  const response = await axiosInstance.get('/admin/support-assignees');
  return response.data;
}

export async function updateSupportRecord(kind, submissionId, payload) {
  const response = await axiosInstance.patch(`/admin/support/${submissionId}`, payload, {
    params: { kind },
  });
  return response.data;
}

export async function listUsers(params = {}) {
  const response = await axiosInstance.get('/admin/users', { params: compact(params) });
  return response.data;
}

export async function updateUser(userId, payload) {
  const response = await axiosInstance.patch(`/admin/users/${userId}`, payload);
  return response.data;
}

export async function listRoles() {
  const response = await axiosInstance.get('/admin/roles');
  return response.data;
}

export async function updateRole(role, payload) {
  const response = await axiosInstance.patch(`/admin/roles/${role}`, payload);
  return response.data;
}

export async function getSystemHealth() {
  const response = await axiosInstance.get('/admin/system-health');
  return response.data;
}
