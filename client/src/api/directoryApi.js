import axiosInstance from './axiosInstance.js';

export async function listDirectoryProfiles(directoryType, params = {}) {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== '' && value !== null && value !== undefined,
    ),
  );

  const response = await axiosInstance.get(
    `/directories/${encodeURIComponent(directoryType)}`,
    { params: cleanParams },
  );

  return response.data;
}

export async function getDirectoryProfile(directoryType, slug) {
  const response = await axiosInstance.get(
    `/directories/${encodeURIComponent(directoryType)}/${encodeURIComponent(slug)}`,
  );

  return response.data;
}

export async function listMyDirectoryProfiles() {
  const response = await axiosInstance.get('/directories/profile/self');
  return response.data;
}

export async function saveMyDirectoryProfile(membershipId, payload) {
  const response = await axiosInstance.put(
    `/directories/profile/self/${membershipId}`,
    payload,
  );

  return response.data;
}
