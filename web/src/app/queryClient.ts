import { type ApiResponse } from '@api/types';
import { QueryClient } from '@tanstack/react-query';

/**
 * A 4xx is the server stating the request itself is wrong — replaying it
 * returns the same failure, and against a rate-limited endpoint the retry
 * spends more of the budget and guarantees another 429. Only transient
 * failures (5xx, or a network error, which the axios plugin normalises to
 * status 0) are worth a second attempt.
 */
function retryTransientOnly(failureCount: number, error: unknown): boolean {
  const status = (error as ApiResponse)?.error?.status_code ?? 0;
  if (status >= 400 && status < 500) return false;
  return failureCount < 1;
}

/** Treat data as fresh for 30s to avoid refetch storms. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: retryTransientOnly,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
    // Never auto-retry a write — replaying it is rarely safe.
    mutations: {
      retry: 0,
    },
  },
});
