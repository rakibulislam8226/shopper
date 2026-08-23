import { EmptySection } from '@components/dashboard/EmptySection';
import { PageHeader } from '@components/dashboard/PageHeader';
import { useAuthStore } from '@stores/auth';
import { type ReactNode } from 'react';

/**
 * Landing screen for a signed-in user.
 *
 * The metric tiles render as unavailable rather than showing invented numbers:
 * none of the reporting endpoints exist yet, and a dashboard that displays
 * plausible fiction is worse than one that admits it has nothing — someone
 * eventually screenshots it into a status update.
 */

interface Metric {
  label: string;
  hint: string;
  icon: ReactNode;
}

const METRICS: Metric[] = [
  {
    label: "Today's sales",
    hint: 'Awaiting the sales endpoint',
    icon: <path d="M3 3v18h18M7 15l4-4 3 3 5-6" />,
  },
  {
    label: 'Revenue today',
    hint: 'Awaiting the sales endpoint',
    icon: <path d="M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />,
  },
  {
    label: 'Low stock items',
    hint: 'Awaiting the products endpoint',
    icon: <path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8" />,
  },
  {
    label: 'Active staff',
    hint: 'Awaiting the memberships endpoint',
    icon: <path d="M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />,
  },
];

function MetricCard({ label, hint, icon }: Metric) {
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm text-slate-400">{label}</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800/70 text-slate-500">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
          >
            {icon}
          </svg>
        </span>
      </div>
      <p className="text-2xl font-semibold text-slate-600">—</p>
      <p className="mt-1 text-xs text-slate-600">{hint}</p>
    </article>
  );
}

export function OverviewPage() {
  const name = useAuthStore((state) => state.name);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={`Welcome back, ${name ?? 'there'}`}
        description="Your organizations, inventory and sales at a glance."
      />

      <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
        <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-amber-400" aria-hidden="true" />
        <p className="text-sm text-amber-200/80">
          <span className="font-medium">Frontend preview.</span> Authentication is live; the
          reporting, product and sales endpoints are not built yet, so every figure below reads as
          unavailable rather than showing sample data.
        </p>
      </div>

      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {METRICS.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-slate-300">Recent sales</h2>
          <EmptySection
            title="No sales to show"
            description="Once the sales module ships, the latest transactions for your organization will appear here."
          />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-slate-300">Account</h2>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-500">Signed in as</dt>
                <dd className="truncate font-medium text-slate-200">{name}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-500">Session</dt>
                <dd className="font-medium text-emerald-400">Active</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-500">Token renewal</dt>
                <dd className="font-medium text-slate-300">Automatic</dd>
              </div>
            </dl>
            <p className="mt-4 border-t border-slate-800 pt-4 text-xs leading-relaxed text-slate-600">
              Your access token refreshes in the background. You stay signed in until the refresh
              token expires.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
