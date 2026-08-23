import { type TokenPair } from '@api/auth';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Session state, persisted to localStorage so a reload keeps the user signed in.
 *
 * Only three values are kept: the display name and the two tokens. Everything
 * else about the user (phone, flags, timestamps) stays on the server and is
 * fetched when a screen actually needs it — persisted copies go stale, and the
 * less identifying data sitting in localStorage, the smaller the blast radius
 * if a script on this origin is ever compromised.
 *
 * Read outside React by the axios interceptors via `useAuthStore.getState()`,
 * so every action stays synchronous and side-effect free.
 */
export interface AuthState {
  name: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  /** Sign-in: display name plus the first token pair. */
  setSession: (name: string, tokens: TokenPair) => void;
  /** Refresh: a rotated token pair, same user. */
  setTokens: (tokens: TokenPair) => void;
  /** Sign-out, or a refresh that failed for good. */
  clearSession: () => void;
}

/** localStorage key. Versioned so a future shape change can migrate cleanly. */
const STORAGE_KEY = 'shopper.auth';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      name: null,
      accessToken: null,
      refreshToken: null,

      setSession: (name, tokens) =>
        set({
          name,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
        }),

      setTokens: (tokens) =>
        set({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
        }),

      clearSession: () => set({ name: null, accessToken: null, refreshToken: null }),
    }),
    {
      name: STORAGE_KEY,
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        name: state.name,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
      // v1 persisted a full user object. Anything older is dropped rather than
      // migrated — the user simply signs in again once.
      migrate: () => ({ name: null, accessToken: null, refreshToken: null }),
    },
  ),
);

/** True when a usable session exists. Read this rather than testing fields ad hoc. */
export function useIsAuthenticated(): boolean {
  return useAuthStore((state) => state.accessToken !== null && state.name !== null);
}
