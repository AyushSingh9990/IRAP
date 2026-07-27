import axiosInstance from './axiosInstance.js';

export async function getDashboardOverview() {
  const response = await axiosInstance.get('/dashboard');
  return response.data;
}

export async function updateDashboardAccount(payload) {
  const response = await axiosInstance.patch('/dashboard/account', payload);
  return response.data;
}
