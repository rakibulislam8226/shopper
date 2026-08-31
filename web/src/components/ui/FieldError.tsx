import { WarningIcon } from './icons';

/**
 * Inline field-level error text, shared by every form that reads a
 * `field -> msg` map back from the API (see `lib/apiErrors.ts`). Renders
 * nothing when there's no message, so callers can pass it unconditionally:
 * `<FieldError message={fieldErrors.phone} />`.
 */
export function FieldError({ message }: { message?: string }) {
  if (!message) return null;

  return (
    <span className="flex items-center gap-1 text-xs text-rose-400">
      <WarningIcon />
      {message}
    </span>
  );
}
