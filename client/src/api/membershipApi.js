import axiosInstance from './axiosInstance.js';

export async function listMyMemberships() {
  const response = await axiosInstance.get('/memberships/self');
  return response.data;
}

export async function getMyMembership(membershipId) {
  const response = await axiosInstance.get(`/memberships/self/${membershipId}`);
  return response.data;
}

export async function startMembershipRenewal(membershipId) {
  const response = await axiosInstance.post(
    `/memberships/self/${membershipId}/renewals`,
    {},
  );
  return response.data;
}

export async function getCertificatePdf(certificateId, download = false) {
  const response = await axiosInstance.get(
    `/memberships/certificates/${certificateId}/pdf`,
    {
      params: download ? { download: 'true' } : {},
      responseType: 'blob',
    },
  );
  return response.data;
}

export async function verifyPublicCertificate(identifier) {
  const response = await axiosInstance.get(
    `/verification/certificates/${encodeURIComponent(identifier)}`,
  );
  return response.data;
}

export async function getMembershipPolicy() {
  const response = await axiosInstance.get('/memberships/admin/policy');
  return response.data;
}

export async function saveMembershipPolicy(payload) {
  const response = await axiosInstance.patch('/memberships/admin/policy', payload);
  return response.data;
}

export async function listAdminMemberships(params = {}) {
  const response = await axiosInstance.get('/memberships/admin/records', { params });
  return response.data;
}

export async function getAdminMembership(membershipId) {
  const response = await axiosInstance.get(`/memberships/admin/records/${membershipId}`);
  return response.data;
}

export async function issueApprovedMembership(applicationId) {
  const response = await axiosInstance.post('/memberships/admin/issue', {
    applicationId,
  });
  return response.data;
}

export async function changeMembershipStatus(membershipId, payload) {
  const response = await axiosInstance.post(
    `/memberships/admin/records/${membershipId}/status`,
    payload,
  );
  return response.data;
}

export async function revokeCertificate(certificateId, payload) {
  const response = await axiosInstance.post(
    `/memberships/admin/certificates/${certificateId}/revoke`,
    payload,
  );
  return response.data;
}

export async function replaceCertificate(certificateId, payload) {
  const response = await axiosInstance.post(
    `/memberships/admin/certificates/${certificateId}/replace`,
    payload,
  );
  return response.data;
}

export async function processMembershipRenewals() {
  const response = await axiosInstance.post(
    '/memberships/admin/process-renewals',
    {},
  );
  return response.data;
}
