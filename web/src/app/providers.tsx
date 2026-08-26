import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { type CSSProperties, type ReactNode } from 'react';
import { Toaster } from 'sonner';

import { queryClient } from './queryClient';
import { ThemeProvider } from './ThemeProvider';

/**
 * Sonner ties the close button's side to text direction (LTR → left) rather
 * than the toaster's screen position, so a top-right toast still gets a
 * left-side close button unless these vars are overridden.
 */
const toasterStyle = {
  '--toast-close-button-start': 'unset',
  '--toast-close-button-end': '0',
  '--toast-close-button-transform': 'translate(35%, -35%)',
} as CSSProperties;

/**
 * Root provider composition. Additional providers (auth, i18n) are layered
 * here as later phases introduce them.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster position="top-right" richColors closeButton style={toasterStyle} />
        {import.meta.env.DEV ? <ReactQueryDevtools initialIsOpen={false} /> : null}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
