/**
 * Join conditional class names. Falsy entries are dropped so callers can write
 * `cn('base', isActive && 'active')` without leaving stray spaces.
 *
 * Deliberately not a Tailwind-aware merger: later classes win only by CSS
 * ordering, not by understanding that `px-4` should replace `px-3`. Component
 * variants below are written so their class sets don't overlap, and a caller's
 * `className` is appended last.
 */
export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}
