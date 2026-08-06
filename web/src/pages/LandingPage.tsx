import { useHealth } from '@api/health';
import { StatusPill } from '@components/ui/StatusPill';

/**
 * Placeholder landing page. It confirms the frontend boots and can reach the
 * backend by rendering the live health result — no product UI yet.
 */
export function LandingPage() {
  const { data, isLoading, isError } = useHealth();
  const health = data?.data;

  const dependencies = health
    ? [
        { name: 'database', status: health.database },
        { name: 'redis', status: health.redis },
      ]
    : [];

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-12">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium tracking-wide text-slate-300">
          Phase 0 · Infrastructure
        </span>
        <h1 className="text-3xl font-semibold sm:text-4xl">shopper</h1>
        <p className="max-w-md text-sm text-slate-400">
          The backend is scaffolded and running. Business features arrive in later phases.
        </p>
      </div>

      <section className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-300">API health</h2>

        {isLoading ? (
          <p className="text-sm text-slate-500">Checking…</p>
        ) : isError || !health ? (
          <p className="text-sm text-rose-400">Unable to reach the API.</p>
        ) : (
          <ul className="space-y-2">
            {dependencies.map((dependency) => (
              <li key={dependency.name} className="flex items-center justify-between text-sm">
                <span className="text-slate-300">{dependency.name}</span>
                <StatusPill
                  label={dependency.status}
                  tone={dependency.status === 'ok' ? 'positive' : 'negative'}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
