import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '');
const apiBaseUrl = configuredBaseUrl
  ? configuredBaseUrl.endsWith('/api/v1')
    ? configuredBaseUrl
    : `${configuredBaseUrl}/api/v1`
  : import.meta.env.DEV
    ? 'http://localhost:8000/api/v1'
    : '/api/v1';

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
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  },
);