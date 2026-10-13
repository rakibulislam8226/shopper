import { type AdminUser, useAdminUsers } from '@api/admin';
import { EmptySection } from '@components/dashboard/EmptySection';
import { PageHeader } from '@components/dashboard/PageHeader';
import { SearchIcon, ShieldIcon, UserIcon } from '@components/ui/icons';
import { Pagination } from '@components/ui/Pagination';
import { StatusPill } from '@components/ui/StatusPill';
import { formatDateTime } from '@lib/format';
import { useDebouncedValue } from '@lib/useDebouncedValue';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const PAGE_SIZE = 10;
const MIN_SEARCH_LENGTH = 2;

export function AdminUsersPage() {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebouncedValue(searchInput.trim());
  const q = debouncedSearch.length >= MIN_SEARCH_LENGTH ? debouncedSearch : '';

  const { data, isLoading, isError } = useAdminUsers({ q, page, limit: PAGE_SIZE });

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Users" description="Every account on the platform." />

      <div className="mb-4 flex items-center gap-2 rounded-lg border border-edge-strong bg-inset px-3 py-2 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-brand-ring">
        <SearchIcon className="h-4 w-4 shrink-0 text-text-faint" />
        <input
          type="search"
          value={searchInput}
          onChange={(event) => {
            setSearchInput(event.target.value);
            setPage(1);
          }}
          placeholder="Search by name or phone"
          className="w-full bg-transparent text-lg text-text-primary outline-none placeholder:text-text-faint"
        />
      </div>

      {isError ? (
        <p className="text-sm text-rose-400">Unable to load users.</p>
      ) : isLoading && !data ? (
        <p className="text-sm text-text-muted">Loading users…</p>
      ) : (
        <>
          <UsersTable
            users={data?.users ?? []}
            onOpen={(userUid) => navigate(`/admin/users/${userUid}`)}
          />
          {data && <Pagination meta={data.meta} onPageChange={setPage} />}
        </>
      )}
    </div>
  );
}

function UsersTable({
  users,
  onOpen,
}: {
  users: AdminUser[];
  onOpen: (userUid: string) => void;
}) {
  if (users.length === 0) {
    return <EmptySection title="No users found" description="Try a different search." />;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-edge-strong bg-card">
      <table className="w-full min-w-170 text-left text-sm">
        <thead>
          <tr className="border-b border-edge-strong text-xs text-text-muted">
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Organizations</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Last login</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr
              key={user.uid}
              onClick={() => onOpen(user.uid)}
              className="cursor-pointer border-b border-edge-strong last:border-0 hover:bg-panel"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-elevated text-text-muted">
                    <UserIcon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate font-medium text-text-secondary">
                      {user.name}
                      {user.is_superuser && (
                        <ShieldIcon className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
                      )}
                    </p>
                    <p className="truncate text-xs text-text-muted">{user.phone}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                {user.organizations.length === 0 ? (
                  <span className="text-xs text-text-muted">—</span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {user.organizations.map(({ shop }) => (
                      <span
                        key={shop.uid}
                        className="rounded-full bg-elevated px-2 py-0.5 text-xs text-text-muted"
                      >
                        {shop.name}
                      </span>
                    ))}
                  </div>
                )}
              </td>
              <td className="px-4 py-3">
                <StatusPill
                  label={user.is_active ? 'Active' : 'Deactivated'}
                  tone={user.is_active ? 'positive' : 'negative'}
                />
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-text-muted">
                {formatDateTime(user.last_login_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
