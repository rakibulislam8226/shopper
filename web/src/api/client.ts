import axios, { type AxiosError, type AxiosInstance } from 'axios';

import { type ApiResponse } from './types';

/**
 * Single configured axios instance for the whole app. `/api` is same-origin —
 * the dev server proxies it to FastAPI (see vite.config.ts), and in production
 * FastAPI serves both the API and the built frontend from one origin.
 * Responses that fail are normalised so callers always see the backend's
 * `ApiResponse` standard error shape (or a synthetic one for network errors).
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 15_000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse>) => {
    const normalised: ApiResponse = error.response?.data ?? {
      status: false,
      message: error.message || 'Network error',
      data: null,
      meta: {
        path: error.config?.url ?? '',
        timestamp: new Date().toISOString(),
      },
    };
    return Promise.reject(normalised);
  },
);
