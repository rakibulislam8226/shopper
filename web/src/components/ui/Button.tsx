import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

import { buttonClasses, type ButtonStyleProps } from './buttonStyles';

// Types only. Re-exporting `buttonClasses` (a value) from a component module
// breaks React Fast Refresh — import it from './buttonStyles' directly.
export type { ButtonSize, ButtonStyleProps, ButtonVariant } from './buttonStyles';

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
