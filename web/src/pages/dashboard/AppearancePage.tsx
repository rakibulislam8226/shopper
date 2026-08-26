import { useTheme } from '@app/ThemeProvider';
import { PageHeader } from '@components/dashboard/PageHeader';
import { CheckIcon, type IconProps, MoonIcon, SunIcon } from '@components/ui/icons';
import { cn } from '@lib/cn';
import { type ThemeMode } from '@lib/theme';
import { type ComponentType } from 'react';

const OPTIONS: { mode: ThemeMode; label: string; description: string; icon: ComponentType<IconProps> }[] = [
  { mode: 'light', label: 'Light', description: 'Bright background, dark text.', icon: SunIcon },
  { mode: 'dark', label: 'Dark', description: 'Dark background, light text.', icon: MoonIcon },
  {
    mode: 'system',
    label: 'System',
    description: 'Follows your device setting.',
    icon: SystemIcon,
  },
];

function SystemIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true" {...props}>
      <rect x="2" y="4" width="20" height="13" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 21h8M12 17v4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AppearancePage() {
  const { mode, setMode } = useTheme();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Appearance" description="Choose how shopper looks on this device." />

      <div className="grid gap-3 sm:grid-cols-3">
        {OPTIONS.map(({ mode: optionMode, label, description, icon: Icon }) => {
          const selected = mode === optionMode;
          return (
            <button
              key={optionMode}
              type="button"
              onClick={() => setMode(optionMode)}
              aria-pressed={selected}
              className={cn(
                'relative flex flex-col items-start gap-3 rounded-2xl border p-4 text-left transition-colors duration-150',
                selected
                  ? 'border-brand bg-brand-soft ring-1 ring-brand-ring'
                  : 'border-edge-strong bg-card hover:bg-panel',
              )}
            >
              <span
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-lg',
                  selected ? 'bg-brand text-white' : 'bg-elevated text-text-muted',
                )}
              >
                <Icon className="h-4.5 w-4.5" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-text-primary">{label}</span>
                <span className="mt-0.5 block text-xs text-text-muted">{description}</span>
              </span>
              {selected && (
                <span className="absolute top-4 right-4 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white">
                  <CheckIcon className="h-3 w-3" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
