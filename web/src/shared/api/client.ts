import axios, { type AxiosError, type AxiosInstance } from 'axios';

import { env } from '../config/env';
import { type ApiErrorResponse } from '../types/api';

/**
 * Single configured axios instance for the whole app. Base URL comes from the
 * validated environment; responses that fail are normalised so callers always
 * see the backend's `ApiErrorResponse` shape (or a synthetic one for network
 * errors that never reached the server).
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: env.VITE_API_BASE_URL,
  timeout: 15_000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    const normalised: ApiErrorResponse = error.response?.data ?? {
      detail: error.message || 'Network error',
      status_code: 0,
      path: error.config?.url ?? '',
      timestamp: new Date().toISOString(),
    };
    return Promise.reject(normalised);
  },
);
