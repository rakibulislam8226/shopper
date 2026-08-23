import Axios, { type AxiosInstance } from 'axios';

import { attachAuthPlugin } from './auth';
import { attachToastPlugin } from './toast';

/**
 * Single configured axios instance for the whole app. `/api` is same-origin —
 * the dev server proxies it to FastAPI (see vite.config.ts), and in production
 * FastAPI serves both the API and the built frontend from one origin.
 *
 * No fixed `Content-Type` here — axios sets `application/json` on its own for
 * plain object payloads, and the browser sets `multipart/form-data` (with the
 * correct boundary) when a call passes a `FormData` body, e.g. file uploads.
 * A hardcoded header would fight that per-request negotiation.
 */
export const axios: AxiosInstance = Axios.create({
  baseURL: '/api',
  timeout: 15_000,
  withCredentials: true,
});

// Order matters. Response interceptors run in registration order, so the auth
// plugin sees a raw AxiosError and gets its chance to refresh-and-replay
// first; the toast plugin then normalises whatever is left into an
// ApiResponse. Reversed, the auth plugin would receive an already-normalised
// object with no `config` to replay.
attachAuthPlugin(axios);
attachToastPlugin(axios);
