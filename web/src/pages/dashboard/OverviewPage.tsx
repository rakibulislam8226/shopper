import { EmptySection } from '@components/dashboard/EmptySection';
import { PageHeader } from '@components/dashboard/PageHeader';
import {
  BoxIcon,
  type IconProps,
  RevenueIcon,
  TrendUpIcon,
  UsersIcon,
} from '@components/ui/icons';
import { useAuthStore } from '@stores/auth';
import { type ComponentType } from 'react';

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
  icon: ComponentType<IconProps>;
}

const METRICS: Metric[] = [
  { label: "Today's sales", hint: 'Awaiting the sales endpoint', icon: TrendUpIcon },
  { label: 'Revenue today', hint: 'Awaiting the sales endpoint', icon: RevenueIcon },
  { label: 'Low stock items', hint: 'Awaiting the products endpoint', icon: BoxIcon },
  { label: 'Active staff', hint: 'Awaiting the memberships endpoint', icon: UsersIcon },
];

function MetricCard({ label, hint, icon: Icon }: Metric) {
  return (
    <article className="rounded-2xl border border-edge-strong bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm text-text-muted">{label}</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-elevated text-text-muted">
          <Icon strokeWidth={1.6} className="h-4 w-4" />
        </span>
      </div>
      <p className="text-2xl font-semibold text-text-faint">—</p>
      <p className="mt-1 text-xs text-text-faint">{hint}</p>
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

      <div className="mb-6 flex items-start gap-3 rounded-xl border border-brand-ring bg-brand-soft px-4 py-3">
        <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-brand" aria-hidden="true" />
        <p className="text-sm text-text-secondary">
          <span className="font-medium text-text-primary">Frontend preview.</span> Authentication
          is live; the reporting, product and sales endpoints are not built yet, so every figure
          below reads as unavailable rather than showing sample data.
        </p>
      </div>

      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {METRICS.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-text-secondary">Recent sales</h2>
          <EmptySection
            title="No sales to show"
            description="Once the sales module ships, the latest transactions for your organization will appear here."
          />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-text-secondary">Account</h2>
          <div className="rounded-2xl border border-edge-strong bg-card p-5">
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-text-muted">Signed in as</dt>
                <dd className="truncate font-medium text-text-secondary">{name}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-text-muted">Session</dt>
                <dd className="font-medium text-emerald-400">Active</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-text-muted">Token renewal</dt>
                <dd className="font-medium text-text-secondary">Automatic</dd>
              </div>
            </dl>
            <p className="mt-4 border-t border-edge pt-4 text-xs leading-relaxed text-text-faint">
              Your access token refreshes in the background. You stay signed in until the refresh
              token expires.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
