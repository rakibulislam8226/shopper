import { useShopStatus } from '@api/shops';
import { WarningIcon } from '@components/ui/icons';
import { useAuthStore } from '@stores/auth';
import { type ReactNode } from 'react';

const STATUS_MESSAGE: Record<string, string> = {
  pending: "This organization's registration is still pending review.",
  suspended: 'This organization has been suspended.',
  rejected: "This organization's registration was rejected.",
  removed: 'This organization has been removed.',
};

/** Blocks every dashboard screen until the active shop is ACTIVE. */
export function OrganizationGate({ children }: { children: ReactNode }) {
  const activeShopUid = useAuthStore((state) => state.activeShopUid);
  const { data: shop, isLoading } = useShopStatus(activeShopUid);

  if (!activeShopUid || isLoading) return children;
  if (shop && shop.status !== 'active') {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-edge-strong bg-card px-6 py-16 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-elevated text-amber-500">
          <WarningIcon className="h-6 w-6" />
        </span>
        <h2 className="text-base font-semibold text-text-secondary">
          {STATUS_MESSAGE[shop.status] ?? 'This organization is not active.'}
        </h2>
        <p className="max-w-sm text-sm leading-relaxed text-text-muted">
          {shop.rejection_reason ||
            'Contact your administrator to get access to these features.'}
        </p>
      </div>
    );
  }

  return children;
}
