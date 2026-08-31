import { FieldError } from '@components/ui/FieldError';
import { cn } from '@lib/cn';
import { type ReactNode, useEffect, useRef, useState } from 'react';

import { CheckIcon, ChevronDownIcon } from './icons';

export interface SelectOption<Value extends string> {
  value: Value;
  label: string;
  /** Optional second line under the label (e.g. what a role can do). */
  description?: string;
}

export interface SelectProps<Value extends string> {
  /** Omit for a standalone filter control with no field label above it. */
  label?: string;
  icon?: ReactNode;
  value: Value;
  onChange: (value: Value) => void;
  options: SelectOption<Value>[];
  error?: string;
  /** `md` (default) matches the add-employee form's fields; `sm` fits a filter bar. */
  size?: 'sm' | 'md';
  /** Extra classes for the trigger button — layout only, not a style override. */
  className?: string;
}

const TRIGGER_SIZE_CLASSES: Record<'sm' | 'md', string> = {
  sm: 'gap-2 px-3 py-2 text-sm',
  md: 'gap-2.5 px-3.5 py-3 text-base',
};

/**
 * Custom listbox — a native `<select>` renders as the browser's own bare
 * popup, which reads as an afterthought next to the rest of this form's
 * styled inputs. This one matches them: same field chrome, a proper
 * dropdown panel with a checkmark on the current value, and room for a
 * description line per option (used for "who can be added" context).
 *
 * Closes on an outside click, on Escape, or on picking an option.
 */
export function Select<Value extends string>({
  label,
  icon,
  value,
  onChange,
  options,
  error,
  size = 'md',
  className,
}: SelectProps<Value>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <label className="flex flex-col gap-1.5">
      {label && <span className="text-sm font-medium text-text-muted">{label}</span>}

      <div ref={rootRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={cn(
            'flex w-full cursor-pointer items-center rounded-lg border bg-inset text-left',
            'text-text-primary outline-none transition-all duration-150',
            TRIGGER_SIZE_CLASSES[size],
            error
              ? 'border-rose-500/60'
              : open
                ? 'border-indigo-500 ring-4 ring-brand-ring'
                : 'border-edge-strong hover:border-edge-strong/80',
            className,
          )}
        >
          {icon && <span className="shrink-0 text-text-faint">{icon}</span>}
          <span className="flex-1 truncate">{selected?.label}</span>
          <ChevronDownIcon
            className={cn(
              'h-4 w-4 shrink-0 text-text-faint transition-transform duration-150',
              open && 'rotate-180',
            )}
          />
        </button>

        {open && (
          <ul
            role="listbox"
            className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-edge-strong bg-elevated py-1.5 shadow-2xl"
          >
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className={cn(
                      'flex w-full cursor-pointer items-center gap-3 px-3.5 py-2.5 text-left text-base transition-colors',
                      isSelected
                        ? 'bg-brand-soft text-indigo-400'
                        : 'text-text-secondary hover:bg-panel',
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{option.label}</span>
                      {option.description && (
                        <span className="mt-0.5 block truncate text-xs text-text-muted">
                          {option.description}
                        </span>
                      )}
                    </span>
                    {isSelected && <CheckIcon className="h-4 w-4 shrink-0" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <FieldError message={error} />
    </label>
  );
}
