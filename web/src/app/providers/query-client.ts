import { QueryClient } from '@tanstack/react-query';

/**
 * Shared TanStack Query client with conservative defaults: retry transient
 * failures once, and treat data as fresh for 30s to avoid refetch storms.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
