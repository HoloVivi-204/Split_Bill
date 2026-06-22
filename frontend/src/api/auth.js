import { apiClient } from './axios';

export async function register(payload) {
  const response = await apiClient.post('/auth/register', payload);

  return response.data?.data;
}

export async function login(payload) {
  const response = await apiClient.post('/auth/login', payload);

  return response.data?.data;
}

export async function refreshAccessToken() {
  const response = await apiClient.post('/auth/refresh');

  return response.data?.data;
}

export async function getCurrentUser() {
  const response = await apiClient.get('/auth/me');

  return response.data?.data;
}

export async function updateProfile(payload) {
  const response = await apiClient.patch('/auth/me', payload);

  return response.data?.data;
}

export async function updateDisplayName(payload) {
  const response = await apiClient.patch('/auth/me/display-name', payload);

  return response.data?.data;
}

export async function changePassword(payload) {
  const response = await apiClient.patch('/auth/me/password', payload);

  return response.data?.data;
}

export async function getRecoveryCodes() {
  const response = await apiClient.get('/auth/recovery-codes');

  return response.data?.data;
}

export async function regenerateRecoveryCodes(payload) {
  const response = await apiClient.post('/auth/recovery-codes/regenerate', payload);

  return response.data?.data;
}

export async function uploadAvatar(file) {
  const formData = new FormData();
  formData.append('avatar', file);

  const response = await apiClient.post('/auth/me/avatar', formData);

  return response.data?.data;
}

export async function deleteAvatar() {
  const response = await apiClient.delete('/auth/me/avatar');

  return response.data?.data;
}

export async function deleteAccount() {
  const response = await apiClient.delete('/auth/me');

  return response.data?.data;
}

export async function logout() {
  const response = await apiClient.post('/auth/logout');

  return response.data?.data;
}
