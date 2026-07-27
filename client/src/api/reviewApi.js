import axiosInstance from './axiosInstance.js';

export async function getAdminReviewDashboard() {
  const response = await axiosInstance.get('/admin/reviews/dashboard');
  return response.data;
}

export async function listApplicationReviewQueue(params = {}) {
  const response = await axiosInstance.get('/admin/reviews/queue', { params });
  return response.data;
}

export async function listReviewerAccounts() {
  const response = await axiosInstance.get('/admin/reviews/reviewers');
  return response.data;
}

export async function getApplicationReviewWorkspace(applicationId) {
  const response = await axiosInstance.get(`/admin/reviews/applications/${applicationId}`);
  return response.data;
}

export async function assignApplicationReviewer(applicationId, payload) {
  const response = await axiosInstance.patch(
    `/admin/reviews/applications/${applicationId}/assignment`,
    payload,
  );
  return response.data;
}

export async function bulkAssignApplicationReviewer(payload) {
  const response = await axiosInstance.post('/admin/reviews/assign-bulk', payload);
  return response.data;
}

export async function addApplicationReviewNote(applicationId, payload) {
  const response = await axiosInstance.post(
    `/admin/reviews/applications/${applicationId}/notes`,
    payload,
  );
  return response.data;
}

export async function updateApplicationReviewChecklist(applicationId, payload) {
  const response = await axiosInstance.patch(
    `/admin/reviews/applications/${applicationId}/checklist`,
    payload,
  );
  return response.data;
}

export async function updateApplicationPaymentWaiver(applicationId, payload) {
  const response = await axiosInstance.patch(
    `/admin/reviews/applications/${applicationId}/payment-waiver`,
    payload,
  );
  return response.data;
}

export async function requestApplicationInformation(applicationId, payload) {
  const response = await axiosInstance.post(
    `/admin/reviews/applications/${applicationId}/request-information`,
    payload,
  );
  return response.data;
}

export async function approveReviewedApplication(applicationId, payload) {
  const response = await axiosInstance.post(
    `/admin/reviews/applications/${applicationId}/approve`,
    payload,
  );
  return response.data;
}

export async function rejectReviewedApplication(applicationId, payload) {
  const response = await axiosInstance.post(
    `/admin/reviews/applications/${applicationId}/reject`,
    payload,
  );
  return response.data;
}

export async function suspendReviewedApplication(applicationId, payload) {
  const response = await axiosInstance.post(
    `/admin/reviews/applications/${applicationId}/suspend`,
    payload,
  );
  return response.data;
}

export async function listAdministrativeAuditHistory(params = {}) {
  const response = await axiosInstance.get('/admin/reviews/audit', { params });
  return response.data;
}
