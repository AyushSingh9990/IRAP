import axiosInstance from './axiosInstance.js';

export async function listApplications() {
  const response = await axiosInstance.get('/applications');
  return response.data;
}

export async function createApplication(type) {
  const response = await axiosInstance.post('/applications', { type });
  return response.data;
}

export async function getApplication(applicationId) {
  const response = await axiosInstance.get(`/applications/${applicationId}`);
  return response.data;
}

export async function saveApplicationStep(applicationId, stepKey, data, nextStepKey) {
  const response = await axiosInstance.patch(
    `/applications/${applicationId}/steps/${stepKey}`,
    { data, ...(nextStepKey ? { nextStepKey } : {}) },
  );
  return response.data;
}

export async function submitApplication(applicationId) {
  const response = await axiosInstance.post(`/applications/${applicationId}/submit`);
  return response.data;
}

export async function withdrawApplication(applicationId, reason = '') {
  const response = await axiosInstance.post(`/applications/${applicationId}/withdraw`, {
    reason,
  });
  return response.data;
}
