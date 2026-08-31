/**
 * Display-only formatters — never used for further arithmetic. Money stays a
 * string end-to-end (see `MemberPublic.total_sales` in
 * `app/modules/memberships/schemas.py`) specifically so nothing downstream
 * is tempted to do float math on it; this only ever turns it into text.
 */

const CURRENCY_FORMATTER = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** `"1234.5"` -> `"৳1,234.50"`. */
export function formatCurrency(amount: string): string {
  return `৳${CURRENCY_FORMATTER.format(Number(amount))}`;
}

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

/** An ISO timestamp for display, or "Never" for a null one (e.g. no login yet). */
export function formatDateTime(iso: string | null): string {
  return iso ? DATE_TIME_FORMATTER.format(new Date(iso)) : 'Never';
}
