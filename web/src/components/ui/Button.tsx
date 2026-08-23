import { cn } from '@lib/cn';
import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';


export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'plain';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';


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

function buttonClasses({
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

/** Spinner shown in place of nothing while a button's action is in flight. */
function Spinner() {
  return (
    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
    </svg>
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, ButtonStyleProps {
  /** Shows a spinner and blocks interaction while an action is in flight. */
  isLoading?: boolean;
  /** Replaces the label while loading. Falls back to the normal children. */
  loadingText?: ReactNode;
}

export function Button({
  variant,
  size,
  fullWidth,
  isLoading = false,
  loadingText,
  className,
  children,
  disabled,
  // Defaults to "button": an unset `type` inside a form is "submit", which
  // turns every incidental button into an accidental form submission.
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled ?? isLoading}
      aria-busy={isLoading || undefined}
      className={buttonClasses({ variant, size, fullWidth, className })}
    >
      {isLoading ? <Spinner /> : null}
      {isLoading && loadingText ? loadingText : children}
    </button>
  );
}

export interface ButtonLinkProps extends LinkProps, ButtonStyleProps {}

/** A router link that looks and behaves like a button. Navigation, not action. */
export function ButtonLink({ variant, size, fullWidth, className, ...props }: ButtonLinkProps) {
  return <Link {...props} className={buttonClasses({ variant, size, fullWidth, className })} />;
}
