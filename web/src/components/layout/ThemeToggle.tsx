import { useTheme } from '@app/ThemeProvider';
import { MoonIcon, SunIcon } from '@components/ui/icons';

/**
 * Light/dark switch. Cycles the *resolved* theme rather than exposing all
 * three (`light` / `dark` / `system`) as separate stops — one click always
 * does the obvious thing, and picking either explicit value opts the user
 * out of following the OS from then on.
 */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { resolved, setMode } = useTheme();
  const isDark = resolved === 'dark';

  return (
    <button
      type="button"
      onClick={() => setMode(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-text-muted transition-colors duration-150 hover:bg-panel hover:text-text-primary ${className}`}
    >
      {isDark ? <SunIcon className="h-[18px] w-[18px]" /> : <MoonIcon className="h-[18px] w-[18px]" />}
    </button>
  );
}
