import { useAdminUser, useSetUserActive } from '@api/admin';
import { type MembershipRole } from '@api/memberships';
import { PageHeader } from '@components/dashboard/PageHeader';
import { Button } from '@components/ui/Button';
import { ArrowLeftIcon, ShieldIcon, StoreIcon } from '@components/ui/icons';
import { StatusPill, type StatusTone } from '@components/ui/StatusPill';
import { formatDateTime } from '@lib/format';
import { Link, useParams } from 'react-router-dom';

const ROLE_COPY: Record<MembershipRole, { label: string; tone: StatusTone }> = {
  owner: { label: 'Owner', tone: 'positive' },
  manager: { label: 'Manager', tone: 'neutral' },
  salesman: { label: 'Staff', tone: 'neutral' },
};

export function AdminUserDetailPage() {
  const { userUid } = useParams<{ userUid: string }>();
  const { data: user, isLoading, isError } = useAdminUser(userUid ?? null);
  const setActive = useSetUserActive();

  if (!userUid) return null;

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to="/admin/users"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-secondary"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Users
      </Link>

      {isError ? (
        <p className="text-sm text-rose-400">Unable to load this user.</p>
      ) : isLoading || !user ? (
        <p className="text-sm text-text-muted">Loading…</p>
      ) : (
        <>
          <PageHeader title={user.name} description={user.phone} />

          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill
                label={user.is_active ? 'Active' : 'Deactivated'}
                tone={user.is_active ? 'positive' : 'negative'}
              />
              {user.is_superuser && (
                <span className="flex items-center gap-1 rounded-full border border-edge-strong bg-panel px-2.5 py-1 text-xs text-text-muted">
                  <ShieldIcon className="h-3.5 w-3.5" />
                  Superuser
                </span>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium tracking-wide text-text-muted uppercase">
                  Last login
                </p>
                <p className="mt-1 text-text-secondary">{formatDateTime(user.last_login_at)}</p>
              </div>
              <div>
                <p className="text-xs font-medium tracking-wide text-text-muted uppercase">
                  Joined
                </p>
                <p className="mt-1 text-text-secondary">{formatDateTime(user.created_at)}</p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium tracking-wide text-text-muted uppercase">
                Organizations
              </p>
              {user.organizations.length === 0 ? (
                <p className="text-sm text-text-muted">Not a member of any shop.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {user.organizations.map(({ shop, role }) => {
                    const roleCopy = ROLE_COPY[role];
                    return (
                      <li
                        key={shop.uid}
                        className="flex items-center gap-3 rounded-lg border border-edge-strong bg-inset px-3.5 py-2.5"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-elevated text-text-muted">
                          <StoreIcon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-secondary">
                          {shop.name}
                        </span>
                        <StatusPill label={roleCopy.label} tone={roleCopy.tone} />
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="flex justify-end border-t border-edge-strong pt-5">
              <Button
                variant={user.is_active ? 'danger' : 'primary'}
                size="lg"
                isLoading={setActive.isPending}
                loadingText={user.is_active ? 'Deactivating…' : 'Activating…'}
                onClick={() => setActive.mutate({ userUid, active: !user.is_active })}
              >
                {user.is_active ? 'Deactivate account' : 'Activate account'}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
