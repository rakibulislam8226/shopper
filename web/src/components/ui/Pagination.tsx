import { type PaginationMeta } from '@api/types';
import { Button } from '@components/ui/Button';

export interface PaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
}

/**
 * Reusable pager for any paginated list — driven entirely by the standard
 * `PaginationMeta` shape every list endpoint's envelope carries in `meta`
 * (see `app/core/response.py`), so a new paginated screen only needs to
 * pass its query's `meta` through, no bespoke page-math of its own.
 *
 * Renders nothing when there's only one page (or none) — a pager with
 * nothing to page through is noise, not a control.
 */
export function Pagination({ meta, onPageChange }: PaginationProps) {
  if (meta.total_pages <= 1) return null;

  const firstItem = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const lastItem = Math.min(meta.page * meta.limit, meta.total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-text-muted">
      <span>
        Showing <span className="font-medium text-text-secondary">{firstItem}</span>–
        <span className="font-medium text-text-secondary">{lastItem}</span> of{' '}
        <span className="font-medium text-text-secondary">{meta.total}</span>
      </span>

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={!meta.has_prev}
          onClick={() => onPageChange(meta.page - 1)}
        >
          Previous
        </Button>
        <span className="px-1 text-text-secondary">
          Page {meta.page} of {meta.total_pages}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={!meta.has_next}
          onClick={() => onPageChange(meta.page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
