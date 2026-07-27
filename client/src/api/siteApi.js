import axiosInstance from './axiosInstance.js';

export async function getPublicSiteConfiguration() {
  const response = await axiosInstance.get('/site/configuration');
  return response.data;
}

export async function getPublicContentPage(slug) {
  const response = await axiosInstance.get(`/site/content/${slug}`);
  return response.data;
}

export async function submitContactEnquiry(payload) {
  const response = await axiosInstance.post('/site/contact', payload);
  return response.data;
}

export async function submitComplaint(payload) {
  const response = await axiosInstance.post('/site/complaints', payload);
  return response.data;
}
