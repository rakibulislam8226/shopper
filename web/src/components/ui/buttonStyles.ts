import { cn } from '@lib/cn';

/**
 * The one button in the app. Anything clickable should come from here rather
 * than hand-rolling classes, so hover, focus, disabled, and loading states
 * stay identical everywhere and change in one file.
 *
 * `plain` carries only the shared behaviour (pointer cursor, focus ring,
 * disabled handling) with no colours of its own — for controls that bring
 * their own look, like an avatar disc.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'plain';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

/**
 * Shared behaviour for every variant.
 *
 * `cursor-pointer` is explicit on purpose: Tailwind v4's preflight sets
 * buttons to `cursor: default`, so without this a button feels dead under the
 * mouse. `focus-visible` (not `focus`) shows the ring for keyboard users
 * without flashing it on every mouse click. `disabled:pointer-events-none`
 * would also kill a wrapping tooltip, so disabled buttons keep their events
 * and simply stop looking clickable.
 */
const BASE_CLASSES =
  'inline-flex cursor-pointer select-none items-center justify-center gap-2 rounded-lg font-semibold ' +
  'transition-all duration-200 outline-none ' +
  'focus-visible:ring-2 focus-visible:ring-indigo-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ' +
  'active:scale-[0.98] ' +
  'disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100 ' +
  'aria-disabled:cursor-not-allowed aria-disabled:opacity-60';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-500',
  secondary: 'border border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700/80',
  ghost: 'text-slate-300 hover:bg-slate-800 hover:text-slate-100',
  danger: 'bg-rose-600 text-white shadow-sm hover:bg-rose-500',
  plain: '',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-3.5 py-1.5 text-sm',
  lg: 'px-4 py-2.5 text-sm',
  icon: 'h-9 w-9 p-0 text-xs',
};

export interface ButtonStyleProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

/**
 * The class string behind the component. Exported for the rare element that
 * must be something other than a `<button>` or a router `<Link>` — an `<a>` to
 * an external host, say — so it can still look like one.
 */
export function buttonClasses({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
}: ButtonStyleProps & { className?: string } = {}): string {
  return cn(
    BASE_CLASSES,
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    fullWidth && 'w-full',
    className,
  );
}
