/**
 * API contracts the frontend depends on. These mirror the FastAPI backend's
 * response shapes (app/core/response.py).
 */

/** Metadata payload for list/paginated API responses. */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

/** Global standard API response envelope returned by the backend. */
export interface ApiResponse<T = unknown> {
  status: boolean;
  message: string;
  data: T | null;
  meta?: PaginationMeta | Record<string, unknown> | null;
}

/** Legacy alias for backwards compatibility with error handlers. */
export type ApiErrorResponse = ApiResponse;

/** Health check data structure. */
export interface HealthData {
  status: 'ok' | 'error';
  database: 'ok' | 'down';
  redis: 'ok' | 'down';
}

/** Response payload of GET /health wrapped in ApiResponse. */
export type HealthResponse = ApiResponse<HealthData>;
