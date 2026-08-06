/**
 * The response envelope every backend endpoint returns, mirroring
 * `app/core/response.py`. Endpoint-specific payload shapes live beside their
 * request in `api/<resource>.ts` and plug in here as `ApiResponse<T>`.
 */

/** Pagination state for list endpoints. Only ever set on paginated responses. */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

/** Failure detail. Only ever set on error responses; `meta` stays null there. */
export interface ApiErrorDetail {
  path: string;
  status_code: number;
  timestamp: string;
}

export interface ApiResponse<T = unknown> {
  status: boolean;
  message: string;
  data: T | null;
  error?: ApiErrorDetail | null;
  meta?: PaginationMeta | null;
}
