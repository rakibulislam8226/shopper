import { type AxiosError, type AxiosInstance } from 'axios';
import { toast } from 'sonner';

import { type ApiResponse } from '../api/types';
import { type ApiErrorResponse } from '../lib/apiErrors';

/**
 * Per-request fallback text — only shown when the API response itself has no
 * `message`. The API's `message` always wins when present.
 */
export interface ToastMessages {
  success?: string;
  error?: string;
}

declare module 'axios' {
  interface AxiosRequestConfig {
    /**
     * `true` toasts the backend's `message`. Pass `{ success, error }` to
     * supply fallback text for when the backend didn't send one. Omit (or
     * `false`) to stay silent.
     */
    toast?: boolean | ToastMessages;
  }
}

/**
 * Attaches opt-in success/error toasts to any axios instance returning the
 * backend's `ApiResponse` envelope. Toasts are silent by default — a request
 * only toasts when it explicitly asks for it via `{ toast: true }` or
 * `{ toast: { success: '...', error: '...' } }`. The API's `message` is
 * always shown when present; the config's text is only a fallback for when
 * it's missing.
 */
export function attachToastPlugin(instance: AxiosInstance): void {
  instance.interceptors.response.use(
    (response) => {
      const opt = response.config.toast;
      if (!opt) return response;

      const fallback = typeof opt === 'object' ? opt.success : undefined;
      const message = response.data?.message ?? fallback;
      if (message) toast.success(message);
      return response;
    },
    (error: AxiosError<ApiResponse>) => {
      const normalised: ApiErrorResponse = {
        ...(error.response?.data ?? {
          status: false,
          message: error.message || 'Network error',
          data: null,
          error: null,
          meta: null,
        }),
        // Client-side only — see `ApiErrorResponse`. 0 means no response at
        // all (the request never reached the server, or never came back).
        httpStatus: error.response?.status ?? 0,
      };

      const opt = error.config?.toast;
      if (opt) {
        const fallback = typeof opt === 'object' ? opt.error : undefined;
        const message = normalised.message ?? fallback;
        if (message) toast.error(message);
      }
      return Promise.reject(normalised);
    },
  );
}
