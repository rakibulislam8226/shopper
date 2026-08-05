/**
 * API contracts the frontend depends on. These mirror the FastAPI backend's
 * response shapes (app/core/exceptions.py and app/health/router.py). Kept small
 * and local rather than in a shared package at this project size.
 */

/** Consistent error envelope returned by the backend's exception handlers. */
export interface ApiErrorResponse {
  detail: string | unknown;
  status_code: number;
  path: string;
  timestamp: string;
}

/** Response of GET /health. */
export interface HealthResponse {
  status: 'ok' | 'error';
  database: 'ok' | 'down';
  redis: 'ok' | 'down';
}
