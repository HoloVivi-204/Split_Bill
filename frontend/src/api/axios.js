import axios from 'axios';

import { authStore } from '../stores/authStore';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api';
const LOGIN_ENDPOINT = '/auth/login';
const REFRESH_ENDPOINT = '/auth/refresh';

let refreshPromise = null;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 15000,
});

apiClient.interceptors.request.use((config) => {
  const token = authStore.getState().accessToken;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    if (
      status !== 401
      || originalRequest?._retry
      || originalRequest?.url === LOGIN_ENDPOINT
      || originalRequest?.url === REFRESH_ENDPOINT
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = apiClient.post(REFRESH_ENDPOINT).finally(() => {
          refreshPromise = null;
        });
      }

      const refreshResponse = await refreshPromise;
      const nextToken = refreshResponse.data?.data?.access_token;

      if (!nextToken) {
        throw new Error('Missing refreshed access token');
      }

      authStore.getState().setAccessToken(nextToken);
      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${nextToken}`;

      return apiClient(originalRequest);
    } catch (refreshError) {
      authStore.getState().clearSession();
      window.dispatchEvent(new CustomEvent('splitbill:auth-expired'));

      return Promise.reject(refreshError);
    }
  },
);
