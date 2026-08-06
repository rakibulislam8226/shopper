import { axios } from '@plugins/axios';
import { useQuery } from '@tanstack/react-query';

import { type ApiResponse } from './types';

/** Reachability of one external dependency the API depends on. */
export type DependencyStatus = 'ok' | 'down';

export interface HealthData {
  status: 'ok' | 'error';
  database: DependencyStatus;
  redis: DependencyStatus;
}

/** GET /api/health — reports Postgres and Redis reachability. */
export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const response = await axios.get<ApiResponse<HealthData>>('/health', { toast: true });
      return response.data;
    },
  });
}
