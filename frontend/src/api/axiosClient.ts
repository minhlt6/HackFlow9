import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '');
const configuredBaseUrl = rawBaseUrl
  ? rawBaseUrl.startsWith('/') || /^https?:\/\//i.test(rawBaseUrl)
    ? rawBaseUrl
    : `https://${rawBaseUrl}`
  : '';
const apiBaseUrl = configuredBaseUrl
  ? configuredBaseUrl.endsWith('/api/v1')
    ? configuredBaseUrl
    : `${configuredBaseUrl}/api/v1`
  : import.meta.env.DEV
    ? 'http://localhost:8000/api/v1'
    : 'https://hackflow9-production.up.railway.app/api/v1';

export const axiosClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor tự động gắn Bearer Token
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const data = error.response?.data;
    if (data?.error?.message) {
      data.message = data.error.message;
      data.error_code = data.error.code;
      error.message = data.error.message;
    }
    if (error.response?.status === 401) {
      const token = localStorage.getItem('token');
      const requestUrl = String(error.config?.url || '');
      if (
        !requestUrl.includes('/auth/login') &&
        !requestUrl.includes('/auth/github') &&
        (!token || !token.startsWith('mock-'))
      ) {
        useAuthStore.getState().logout();
      }
    }
    return Promise.reject(error);
  },
);

export const apiClient = axiosClient;
export default axiosClient;
