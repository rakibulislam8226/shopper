import { cn } from '@lib/cn';
import { type InputHTMLAttributes, type ReactNode, useState } from 'react';

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: ReactNode;
  /** Inline validation message (e.g. "Passwords don't match"). Turns the field rose. */
  error?: string;
}

/**
 * Labeled input for the auth forms — a leading icon for quick field
 * recognition, a visibility toggle when `type="password"` so a typo doesn't
 * silently fail credentials, and an optional inline error state.
 */
export function AuthInput({ label, icon, type, className, error, ...props }: AuthInputProps) {
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === 'password';

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-slate-400">{label}</span>
      <div className="group relative">
        <span
          className={cn(
            'pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center transition-colors',
            error ? 'text-rose-400' : 'text-slate-500 group-focus-within:text-indigo-400',
          )}
        >
          {icon}
        </span>
        <input
          {...props}
          type={isPassword && revealed ? 'text' : type}
          aria-invalid={error ? true : undefined}
          className={cn(
            'w-full rounded-lg border bg-inset py-2 pr-3 pl-10 text-sm text-slate-100',
            'outline-none transition-all duration-200 placeholder:text-slate-600',
            error
              ? 'border-rose-500/60 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
              : 'border-edge-strong focus:border-indigo-500 focus:ring-4 focus:ring-brand-ring',
            isPassword && 'pr-10',
            className,
          )}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((value) => !value)}
            tabIndex={-1}
            aria-label={revealed ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-500 transition-colors hover:text-slate-300"
          >
            {revealed ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}
      </div>
      {error && (
        <span className="flex items-center gap-1 text-xs text-rose-400">
          <WarningIcon />
          {error}
        </span>
      )}
    </label>
  );
}

function iconProps() {
  return {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className: 'h-4 w-4',
    'aria-hidden': true,
  };
}

export function UserIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function PhoneIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M13.5 2h-3A1.5 1.5 0 0 0 9 3.5v17A1.5 1.5 0 0 0 10.5 22h3a1.5 1.5 0 0 0 1.5-1.5v-17A1.5 1.5 0 0 0 13.5 2Z" />
      <path d="M11 18h2" />
    </svg>
  );
}

export function LockIcon() {
  return (
    <svg {...iconProps()}>
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export function StoreIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3 w-3 shrink-0"
      aria-hidden="true"
    >
      <path d="M12 9v4M12 17h.01" />
      <path d="M10.3 3.6 1.9 18a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0Z" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M9.9 4.24A10.4 10.4 0 0 1 12 4c6.5 0 10 7 10 7a17.5 17.5 0 0 1-2.3 3.3M6.6 6.6C3.4 8.5 2 12 2 12s3.5 7 10 7a10.1 10.1 0 0 0 4.2-.9M2 2l20 20" />
      <path d="M14.1 14.1a3 3 0 1 1-4.2-4.2" />
    </svg>
  );
}
