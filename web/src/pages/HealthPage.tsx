import { type DependencyStatus, useHealth } from '@api/health';
import { Button } from '@components/ui/Button';
import { StatusPill } from '@components/ui/StatusPill';

interface DependencyRow {
  name: string;
  description: string;
  status: DependencyStatus;
}

/** Renders a timestamp as a readable local time, or a dash before the first fetch. */
function formatChecked(updatedAt: number): string {
  if (!updatedAt) return '—';
  return new Date(updatedAt).toLocaleTimeString();
}

/**
 * Live view of `GET /api/health`. Separate from the landing page: this is an
 * operational screen, and the marketing page shouldn't hit the API to render.
 */
export function HealthPage() {
  const { data, isLoading, isError, isFetching, refetch, dataUpdatedAt } = useHealth();
  const health = data?.data;
  const healthy = health?.status === 'ok';

  const dependencies: DependencyRow[] = health
    ? [
        { name: 'PostgreSQL', description: 'Primary datastore', status: health.database },
        { name: 'Redis', description: 'Rate limiting and token store', status: health.redis },
      ]
    : [];

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12 sm:py-16">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">System status</h1>
          <p className="mt-1 text-sm text-slate-400">
            Live reachability of the services the API depends on.
          </p>
        </div>

        <Button
          variant="secondary"
          onClick={() => void refetch()}
          isLoading={isFetching}
          loadingText="Checking…"
        >
          Re-check
        </Button>
      </header>

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50">
        <div className="flex items-center justify-between gap-4 border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-3">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                isLoading
                  ? 'bg-slate-600'
                  : healthy
                    ? 'bg-emerald-400 shadow-[0_0_12px] shadow-emerald-400/60'
                    : 'bg-rose-500 shadow-[0_0_12px] shadow-rose-500/60'
              }`}
              aria-hidden="true"
            />
            <span className="text-sm font-semibold text-slate-100">
              {isLoading
                ? 'Checking services…'
                : isError || !health
                  ? 'API unreachable'
                  : healthy
                    ? 'All systems operational'
                    : 'Degraded service'}
            </span>
          </div>

          <span className="text-xs text-slate-500">Checked {formatChecked(dataUpdatedAt)}</span>
        </div>

        {isError || (!health && !isLoading) ? (
          <p className="px-5 py-6 text-sm text-rose-400">
            The API did not respond. It may be down, or the request was rate limited — wait a moment
            and re-check.
          </p>
        ) : (
          <ul className="divide-y divide-slate-800">
            {(isLoading ? [] : dependencies).map((dependency) => (
              <li key={dependency.name} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-medium text-slate-200">{dependency.name}</p>
                  <p className="text-xs text-slate-500">{dependency.description}</p>
                </div>
                <StatusPill
                  label={dependency.status === 'ok' ? 'operational' : 'down'}
                  tone={dependency.status === 'ok' ? 'positive' : 'negative'}
                />
              </li>
            ))}
            {isLoading ? (
              <li className="px-5 py-6 text-sm text-slate-500">Loading dependencies…</li>
            ) : null}
          </ul>
        )}
      </section>

      <p className="mt-4 text-xs text-slate-600">
        Endpoint: <code className="text-slate-500">GET /api/health</code> — returns 200 when every
        dependency is reachable, 503 otherwise.
      </p>
    </div>
  );
}
