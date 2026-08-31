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

/**
 * One error, matched to the request field it belongs to — mirrors
 * `ApiFieldError` in `app/core/response.py`. `field` is `""` when the error
 * belongs to the whole submission rather than one input (e.g. a cross-field
 * rule); treat that the same as absent — toast `message`, nothing inline.
 */
export interface ApiFieldError {
  field: string;
  msg: string;
}

export interface ApiResponse<T = unknown> {
  status: boolean;
  message: string;
  data: T | null;
  /** Only ever set on a failed, field-attributable request; `null` otherwise. */
  error?: ApiFieldError[] | null;
  meta?: PaginationMeta | null;
}
