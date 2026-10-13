import { type AdminShopSummary, useAdminShops } from '@api/admin';
import { type Shop } from '@api/shops';
import { EmptySection } from '@components/dashboard/EmptySection';
import { PageHeader } from '@components/dashboard/PageHeader';
import { SearchIcon, StoreIcon } from '@components/ui/icons';
import { Pagination } from '@components/ui/Pagination';
import { Select, type SelectOption } from '@components/ui/Select';
import { StatusPill, type StatusTone } from '@components/ui/StatusPill';
import { formatDateTime } from '@lib/format';
import { useDebouncedValue } from '@lib/useDebouncedValue';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const PAGE_SIZE = 10;
const MIN_SEARCH_LENGTH = 2;

const STATUS_FILTER_OPTIONS: SelectOption<Shop['status'] | 'all'>[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending review' },
  { value: 'active', label: 'Active' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'removed', label: 'Removed' },
];

const STATUS_COPY: Record<Shop['status'], { label: string; tone: StatusTone }> = {
  pending: { label: 'Pending review', tone: 'neutral' },
  active: { label: 'Active', tone: 'positive' },
  rejected: { label: 'Rejected', tone: 'negative' },
  suspended: { label: 'Suspended', tone: 'negative' },
  removed: { label: 'Removed', tone: 'negative' },
};

export function AdminShopsPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<Shop['status'] | 'all'>('all');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebouncedValue(searchInput.trim());
  const q = debouncedSearch.length >= MIN_SEARCH_LENGTH ? debouncedSearch : '';

  const { data, isLoading, isError } = useAdminShops({
    status: statusFilter === 'all' ? undefined : statusFilter,
    q,
    page,
    limit: PAGE_SIZE,
  });

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Organizations"
        description="Review new shops and manage the lifecycle of every organization on the platform."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 rounded-lg border border-edge-strong bg-inset px-3 py-2 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-brand-ring">
            <SearchIcon className="h-4 w-4 shrink-0 text-text-faint" />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => {
                setSearchInput(event.target.value);
                setPage(1);
              }}
              placeholder="Search by shop or owner"
              className="w-full bg-transparent text-lg text-text-primary outline-none placeholder:text-text-faint"
            />
          </div>
        </div>

        <div className="w-48 shrink-0">
          <Select
            size="md"
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value);
              setPage(1);
            }}
            options={STATUS_FILTER_OPTIONS}
          />
        </div>
      </div>

      {isError ? (
        <p className="text-sm text-rose-400">Unable to load shops.</p>
      ) : isLoading && !data ? (
        <p className="text-sm text-text-muted">Loading shops…</p>
      ) : (
        <>
          <ShopsTable
            shops={data?.shops ?? []}
            onOpen={(shopUid) => navigate(`/admin/shops/${shopUid}`)}
          />
          {data && <Pagination meta={data.meta} onPageChange={setPage} />}
        </>
      )}
    </div>
  );
}

function ShopsTable({
  shops,
  onOpen,
}: {
  shops: AdminShopSummary[];
  onOpen: (shopUid: string) => void;
}) {
  if (shops.length === 0) {
    return (
      <EmptySection
        title="No shops found"
        description="Try a different search or status filter."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-edge-strong bg-card">
      <table className="w-full min-w-170 text-left text-sm">
        <thead>
          <tr className="border-b border-edge-strong text-xs text-text-muted">
            <th className="px-4 py-3 font-medium">Shop</th>
            <th className="px-4 py-3 font-medium">Owner</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Submitted</th>
          </tr>
        </thead>
        <tbody>
          {shops.map(({ shop, owner }) => {
            const status = STATUS_COPY[shop.status];
            return (
              <tr
                key={shop.uid}
                onClick={() => onOpen(shop.uid)}
                className="cursor-pointer border-b border-edge-strong last:border-0 hover:bg-panel"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-elevated text-text-muted">
                      <StoreIcon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-text-secondary">{shop.name}</p>
                      <p className="truncate text-xs text-text-muted">{shop.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="truncate text-text-secondary">{owner?.name ?? '—'}</p>
                  <p className="truncate text-xs text-text-muted">{owner?.phone ?? ''}</p>
                </td>
                <td className="px-4 py-3">
                  <StatusPill label={status.label} tone={status.tone} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-text-muted">
                  {formatDateTime(shop.created_at)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
