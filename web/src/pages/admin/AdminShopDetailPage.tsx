import {
  useAdminShop,
  useAdminShopMembers,
  useApproveShop,
  useReactivateShop,
  useRejectShop,
  useRemoveShop,
  useSuspendShop,
} from '@api/admin';
import { type Employee, type MembershipRole } from '@api/memberships';
import { type Shop } from '@api/shops';
import { PageHeader } from '@components/dashboard/PageHeader';
import { Button } from '@components/ui/Button';
import { ArrowLeftIcon, FileIcon, UserIcon } from '@components/ui/icons';
import { StatusPill, type StatusTone } from '@components/ui/StatusPill';
import { formatCurrency, formatDateTime } from '@lib/format';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

const STATUS_COPY: Record<Shop['status'], { label: string; tone: StatusTone }> = {
  pending: { label: 'Pending review', tone: 'neutral' },
  active: { label: 'Active', tone: 'positive' },
  rejected: { label: 'Rejected', tone: 'negative' },
  suspended: { label: 'Suspended', tone: 'negative' },
  removed: { label: 'Removed', tone: 'negative' },
};

const ROLE_COPY: Record<MembershipRole, { label: string; tone: StatusTone }> = {
  owner: { label: 'Owner', tone: 'positive' },
  manager: { label: 'Manager', tone: 'neutral' },
  salesman: { label: 'Staff', tone: 'neutral' },
};

const DOCUMENT_TYPE_LABEL: Record<string, string> = {
  owner_nid: "Owner's NID",
  trade_license: 'Trade license',
  tin_certificate: 'TIN certificate',
  other: 'Other document',
};

export function AdminShopDetailPage() {
  const { shopUid } = useParams<{ shopUid: string }>();
  const { data, isLoading, isError } = useAdminShop(shopUid ?? null);
  const members = useAdminShopMembers(shopUid ?? null);

  const approveShop = useApproveShop();
  const rejectShop = useRejectShop();
  const suspendShop = useSuspendShop();
  const reactivateShop = useReactivateShop();
  const removeShop = useRemoveShop();
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [reason, setReason] = useState('');

  if (!shopUid) return null;

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        to="/admin/shops"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-secondary"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Organizations
      </Link>

      {isError ? (
        <p className="text-sm text-rose-400">Unable to load this shop.</p>
      ) : isLoading || !data ? (
        <p className="text-sm text-text-muted">Loading…</p>
      ) : (
        <>
          <PageHeader title={data.shop.name} description={data.shop.slug} />

          <div className="flex flex-col gap-6">
            <div className="flex items-start justify-between gap-4">
              <StatusPill
                label={STATUS_COPY[data.shop.status].label}
                tone={STATUS_COPY[data.shop.status].tone}
              />
            </div>

            {data.shop.rejection_reason && (
              <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-sm text-rose-400">
                Previously rejected: {data.shop.rejection_reason}
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium tracking-wide text-text-muted uppercase">
                  Owner
                </p>
                <p className="mt-1 text-text-secondary">{data.owner?.name ?? 'Unknown'}</p>
                <p className="text-xs text-text-muted">{data.owner?.phone ?? ''}</p>
              </div>
              <div>
                <p className="text-xs font-medium tracking-wide text-text-muted uppercase">
                  Contact
                </p>
                <p className="mt-1 text-text-secondary">{data.shop.email ?? '—'}</p>
                <p className="text-xs text-text-muted">
                  {data.shop.phone ?? data.shop.address ?? ''}
                </p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium tracking-wide text-text-muted uppercase">
                Submitted documents
              </p>
              {data.documents.length === 0 ? (
                <p className="text-sm text-text-muted">No documents submitted yet.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {data.documents.map((document) => (
                    <li key={document.uid}>
                      <a
                        href={document.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2.5 rounded-lg border border-edge-strong bg-inset px-3.5 py-2.5 text-sm text-text-secondary transition-colors hover:border-indigo-500"
                      >
                        <FileIcon className="h-4 w-4 shrink-0 text-text-faint" />
                        <span className="flex-1 truncate">
                          {DOCUMENT_TYPE_LABEL[document.type] ?? document.type}
                        </span>
                        <span className="text-xs text-text-muted">
                          {formatDateTime(document.created_at)}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <p className="mb-2 text-xs font-medium tracking-wide text-text-muted uppercase">
                Staff
              </p>
              {members.isLoading ? (
                <p className="text-sm text-text-muted">Loading…</p>
              ) : !members.data || members.data.length === 0 ? (
                <p className="text-sm text-text-muted">No staff on this shop yet.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {members.data.map((member) => (
                    <StaffRow key={member.user_uid} member={member} />
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-edge-strong pt-5">
              {showRejectForm ? (
                <div className="flex flex-col gap-3">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-text-muted">
                      Reason (shown to the owner)
                    </span>
                    <textarea
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      rows={3}
                      maxLength={500}
                      className="w-full rounded-lg border border-edge-strong bg-inset px-3.5 py-2.5 text-sm text-text-primary outline-none focus:border-indigo-500 focus:ring-4 focus:ring-brand-ring"
                    />
                  </label>
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" size="lg" onClick={() => setShowRejectForm(false)}>
                      Cancel
                    </Button>
                    <Button
                      variant="danger"
                      size="lg"
                      isLoading={rejectShop.isPending}
                      loadingText="Rejecting…"
                      onClick={() =>
                        rejectShop.mutate(
                          { shopUid, reason: reason.trim() || undefined },
                          { onSuccess: () => setShowRejectForm(false) },
                        )
                      }
                    >
                      Confirm rejection
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap justify-end gap-2">
                  {(data.shop.status === 'pending' || data.shop.status === 'rejected') && (
                    <Button
                      variant="primary"
                      size="lg"
                      isLoading={approveShop.isPending}
                      loadingText="Approving…"
                      onClick={() => approveShop.mutate({ shopUid })}
                    >
                      Approve
                    </Button>
                  )}
                  {data.shop.status === 'pending' && (
                    <Button variant="danger" size="lg" onClick={() => setShowRejectForm(true)}>
                      Reject
                    </Button>
                  )}
                  {data.shop.status === 'active' && (
                    <Button
                      variant="danger"
                      size="lg"
                      isLoading={suspendShop.isPending}
                      loadingText="Suspending…"
                      onClick={() => suspendShop.mutate({ shopUid })}
                    >
                      Suspend
                    </Button>
                  )}
                  {data.shop.status === 'suspended' && (
                    <Button
                      variant="primary"
                      size="lg"
                      isLoading={reactivateShop.isPending}
                      loadingText="Reactivating…"
                      onClick={() => reactivateShop.mutate({ shopUid })}
                    >
                      Reactivate
                    </Button>
                  )}
                  {data.shop.status !== 'removed' && (
                    <Button
                      variant="secondary"
                      size="lg"
                      isLoading={removeShop.isPending}
                      loadingText="Removing…"
                      onClick={() => removeShop.mutate({ shopUid })}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StaffRow({ member }: { member: Employee }) {
  const role = ROLE_COPY[member.role];
  return (
    <li className="flex items-center gap-3 rounded-lg border border-edge-strong bg-inset px-3.5 py-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-elevated text-text-muted">
        <UserIcon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text-secondary">{member.name}</p>
        <p className="truncate text-xs text-text-muted">{member.phone}</p>
      </div>
      <StatusPill label={role.label} tone={role.tone} />
      <span className="w-20 shrink-0 text-right text-xs text-text-muted">
        {formatCurrency(member.total_sales)}
      </span>
    </li>
  );
}
