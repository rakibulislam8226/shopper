import { EyeIcon, EyeOffIcon, WarningIcon } from '@components/ui/icons';
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
