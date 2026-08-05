import { useQuery } from '@tanstack/react-query';

import { apiClient } from '../api/client';
import { type HealthResponse } from '../api/types';

/**
 * Placeholder landing page. It confirms the frontend boots and can reach the
 * backend by rendering the live `/health` result — no product UI yet.
 */
export function LandingPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const response = await apiClient.get<HealthResponse>('/health');
      return response.data;
    },
  });

  const healthData = data?.data;
  const dependencies = healthData
    ? [
        { name: 'database', status: healthData.database },
        { name: 'redis', status: healthData.redis },
      ]
    : [];

  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-6 px-6 py-12 text-slate-100">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium tracking-wide text-slate-300">
          Phase 0 · Infrastructure
        </span>
        <h1 className="text-3xl font-semibold sm:text-4xl">shopper</h1>
        <p className="max-w-md text-sm text-slate-400">
          The backend is scaffolded and running. Business features arrive in later phases.
        </p>
      </div>

      <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-300">API health</h2>
        {isLoading ? (
          <p className="text-sm text-slate-500">Checking…</p>
        ) : isError || !data ? (
          <p className="text-sm text-rose-400">Unable to reach the API.</p>
        ) : (
          <ul className="space-y-2">
            {dependencies.map((dep) => (
              <li key={dep.name} className="flex items-center justify-between text-sm">
                <span className="text-slate-300">{dep.name}</span>
                <StatusPill status={dep.status} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function StatusPill({ status }: { status: string }) {
  const isUp = status === 'ok';
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        isUp ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
      }`}
    >
      {status}
    </span>
  );
}
