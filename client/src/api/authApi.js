import axiosInstance from './axiosInstance.js';

export async function registerAccount(payload) {
  const { data } = await axiosInstance.post('/auth/register', payload);
  return data;
}

export async function verifyEmail(token) {
  const { data } = await axiosInstance.post('/auth/verify-email', { token });
  return data;
}

export async function resendVerification(email) {
  const { data } = await axiosInstance.post('/auth/resend-verification', { email });
  return data;
}

export async function loginAccount(payload) {
  const { data } = await axiosInstance.post('/auth/login', payload);
  return data;
}

export async function logoutAccount() {
  const { data } = await axiosInstance.post('/auth/logout');
  return data;
}

export async function logoutAllAccounts() {
  const { data } = await axiosInstance.post('/auth/logout-all');
  return data;
}

export async function getCurrentAccount() {
  const { data } = await axiosInstance.get('/auth/me');
  return data;
}

export async function requestPasswordReset(email) {
  const { data } = await axiosInstance.post('/auth/forgot-password', { email });
  return data;
}

export async function completePasswordReset(payload) {
  const { data } = await axiosInstance.post('/auth/reset-password', payload);
  return data;
}

export async function changeAccountPassword(payload) {
  const { data } = await axiosInstance.post('/auth/change-password', payload);
  return data;
}

export async function getActiveSessions() {
  const { data } = await axiosInstance.get('/auth/sessions');
  return data;
}

export async function revokeActiveSession(sessionId) {
  const { data } = await axiosInstance.delete(`/auth/sessions/${sessionId}`);
  return data;
}

export async function requestEmailChange(payload) {
  const { data } = await axiosInstance.post('/auth/request-email-change', payload);
  return data;
}

export async function verifyEmailChange(token) {
  const { data } = await axiosInstance.post('/auth/verify-email-change', { token });
  return data;
}

export async function verifyTwoFactorLogin(payload) {
  const { data } = await axiosInstance.post('/auth/verify-two-factor', payload);
  return data;
}
