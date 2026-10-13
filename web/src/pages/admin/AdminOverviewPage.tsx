import { useAdminStats } from '@api/admin';
import { PageHeader } from '@components/dashboard/PageHeader';
import { ScrollIcon, ShieldIcon, StoreIcon, UsersIcon } from '@components/ui/icons';
import { useAuthStore } from '@stores/auth';
import { type ComponentType } from 'react';

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  return (
    <article className="rounded-2xl border border-edge-strong bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm text-text-muted">{label}</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-elevated text-text-muted">
          <Icon strokeWidth={1.6} className="h-4 w-4" />
        </span>
      </div>
      <p className="text-2xl font-semibold text-text-primary">{value}</p>
    </article>
  );
}

/** Landing screen for a signed-in superuser — platform-wide counts, nothing shop-scoped. */
export function AdminOverviewPage() {
  const name = useAuthStore((state) => state.name);
  const { data, isLoading, isError } = useAdminStats();

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={`Welcome back, ${name ?? 'there'}`}
        description="Platform-wide shop and account counts."
      />

      {isError ? (
        <p className="text-sm text-rose-400">Unable to load platform stats.</p>
      ) : isLoading && !data ? (
        <p className="text-sm text-text-muted">Loading…</p>
      ) : (
        <>
          <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Pending review" value={data?.shops_by_status.pending ?? 0} icon={ScrollIcon} />
            <StatCard label="Active shops" value={data?.shops_by_status.active ?? 0} icon={StoreIcon} />
            <StatCard label="Total users" value={data?.total_users ?? 0} icon={UsersIcon} />
            <StatCard label="Superusers" value={data?.total_superusers ?? 0} icon={ShieldIcon} />
          </section>

          <section className="rounded-2xl border border-edge-strong bg-card p-5">
            <h2 className="mb-4 text-sm font-semibold text-text-secondary">Shops by status</h2>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              {Object.entries(data?.shops_by_status ?? {}).map(([status, count]) => (
                <div key={status}>
                  <dt className="text-xs text-text-muted capitalize">{status}</dt>
                  <dd className="text-lg font-semibold text-text-primary">{count}</dd>
                </div>
              ))}
            </dl>
          </section>
        </>
      )}
    </div>
  );
}
