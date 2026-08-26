import {
  applyTheme,
  getStoredTheme,
  getSystemTheme,
  type ResolvedTheme,
  setStoredTheme,
  type ThemeMode,
} from '@lib/theme';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

interface ThemeContextValue {
  /** The user's stored preference — `system` means "follow the OS". */
  mode: ThemeMode;
  /** The actual light/dark value in effect right now. */
  resolved: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Owns the theme preference and keeps `<html>` in sync. The blocking script
 * in `index.html` already applied the correct class before React mounted —
 * this provider takes over from there so subsequent changes (toggle clicks,
 * OS-level scheme changes while on `system`) re-render reactively.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => getStoredTheme() ?? 'system');
  // Only relevant while `mode === 'system'`; tracked separately so a live OS
  // scheme change doesn't need its own `resolved` state to stay in sync with.
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => getSystemTheme());

  const resolved = mode === 'system' ? systemTheme : mode;

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    setStoredTheme(next);
  }, []);

  // Keeps `<html>` in sync with whatever just got rendered. The blocking
  // script in `index.html` already applied the correct class before mount;
  // this covers every change after that (toggle clicks, OS scheme flips).
  useEffect(() => {
    applyTheme(resolved);
  }, [resolved]);

  // While following the OS, react live to the user flipping their system theme.
  useEffect(() => {
    if (mode !== 'system') return;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => setSystemTheme(getSystemTheme());

    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, [mode]);

  const value = useMemo(() => ({ mode, resolved, setMode }), [mode, resolved, setMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
