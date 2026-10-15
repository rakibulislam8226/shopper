import { FieldError } from '@components/ui/FieldError';
import { FieldLabel } from '@components/ui/FieldLabel';
import { cn } from '@lib/cn';
import { useEffect, useRef, useState } from 'react';

import { CheckIcon, ChevronDownIcon } from './icons';

export interface ComboboxOption {
  value: string;
  label: string;
}

export interface ComboboxProps {
  label?: string;
  required?: boolean;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  error?: string;
  /** Offers "Create '<query>'" when the typed text matches no option. */
  onCreate?: (label: string) => void;
  creating?: boolean;
}

/**
 * Searchable, creatable select — type to filter `options`, pick one, or (if
 * `onCreate` is given) create a new one from whatever was typed. Used for
 * product categories: picking an existing one and adding a new one are the
 * same action from the shopper's point of view, so they share one control.
 */
export function Combobox({
  label,
  required,
  hint,
  value,
  onChange,
  options,
  placeholder = 'Search…',
  error,
  onCreate,
  creating = false,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        setQuery('');
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery
    ? options.filter((option) => option.label.toLowerCase().includes(normalizedQuery))
    : options;
  const exactMatch = options.some((option) => option.label.toLowerCase() === normalizedQuery);
  const showCreate = Boolean(onCreate) && normalizedQuery.length > 0 && !exactMatch;

  const handleSelect = (option: ComboboxOption) => {
    onChange(option.value);
    setOpen(false);
    setQuery('');
  };

  const handleCreate = () => {
    onCreate?.(query.trim());
    setOpen(false);
    setQuery('');
  };

  return (
    <div className="flex flex-col gap-1.5" ref={rootRef}>
      {label && (
        <FieldLabel required={required} hint={hint}>
          {label}
        </FieldLabel>
      )}

      <div className="relative">
        <div
          className={cn(
            'flex items-center gap-2.5 rounded-lg border bg-inset px-3.5 py-3 transition-all duration-150',
            error
              ? 'border-rose-500/60'
              : open
                ? 'border-indigo-500 ring-4 ring-brand-ring'
                : 'border-edge-strong hover:border-edge-strong/80',
          )}
        >
          <input
            type="text"
            value={open ? query : (selected?.label ?? '')}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => {
              setOpen(true);
              setQuery('');
            }}
            placeholder={placeholder}
            className="w-full cursor-pointer bg-transparent text-base text-text-primary outline-none placeholder:text-text-faint"
          />
          <ChevronDownIcon
            className={cn(
              'h-4 w-4 shrink-0 text-text-faint transition-transform duration-150',
              open && 'rotate-180',
            )}
          />
        </div>

        {open && (
          <ul className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-edge-strong bg-elevated py-1.5 shadow-2xl">
            {filtered.length === 0 && !showCreate && (
              <li className="px-3.5 py-2.5 text-sm text-text-muted">No matches</li>
            )}
            {filtered.map((option) => {
              const isSelected = option.value === value;
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    onClick={() => handleSelect(option)}
                    className={cn(
                      'flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-base transition-colors',
                      isSelected
                        ? 'bg-brand-soft text-indigo-400'
                        : 'text-text-secondary hover:bg-panel',
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    {isSelected && <CheckIcon className="h-4 w-4 shrink-0" />}
                  </button>
                </li>
              );
            })}
            {showCreate && (
              <li>
                <button
                  type="button"
                  disabled={creating}
                  onClick={handleCreate}
                  className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-base text-indigo-400 transition-colors hover:bg-panel disabled:opacity-60"
                >
                  {creating ? 'Creating…' : `Create "${query.trim()}"`}
                </button>
              </li>
            )}
          </ul>
        )}
      </div>

      <FieldError message={error} />
    </div>
  );
}
