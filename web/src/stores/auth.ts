import { type TokenPair } from '@api/auth';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Session state, persisted to localStorage so a reload keeps the user signed in.
 *
 * Only a handful of values are kept: the display name, the active shop's
 * public uid, and the two tokens. Everything else about the user (phone,
 * flags, timestamps) stays on the server and is fetched when a screen
 * actually needs it — persisted copies go stale, and the less identifying
 * data sitting in localStorage, the smaller the blast radius if a script on
 * this origin is ever compromised.
 *
 * Read outside React by the axios interceptors via `useAuthStore.getState()`,
 * so every action stays synchronous and side-effect free.
 */
export interface AuthState {
  name: string | null;
  /** The shop Settings and other shop-scoped screens operate on. */
  activeShopUid: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  /** Sign-in: display name, active shop uid, and the first token pair. */
  setSession: (name: string, tokens: TokenPair, activeShopUid?: string | null) => void;
  /** Refresh: a rotated token pair, same user. */
  setTokens: (tokens: TokenPair) => void;
  /** After `POST /users/active-shop` succeeds — the shop the user now operates in. */
  setActiveShopUid: (shopUid: string) => void;
  /** Sign-out, or a refresh that failed for good. */
  clearSession: () => void;
}

/** localStorage key. Versioned so a future shape change can migrate cleanly. */
const STORAGE_KEY = 'shopper.auth';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      name: null,
      activeShopUid: null,
      accessToken: null,
      refreshToken: null,

      setSession: (name, tokens, activeShopUid = null) =>
        set({
          name,
          activeShopUid,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
        }),

      setTokens: (tokens) =>
        set({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
        }),

      setActiveShopUid: (shopUid) => set({ activeShopUid: shopUid }),

      clearSession: () =>
        set({ name: null, activeShopUid: null, accessToken: null, refreshToken: null }),
    }),
    {
      name: STORAGE_KEY,
      version: 3,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        name: state.name,
        activeShopUid: state.activeShopUid,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
      // v1 persisted a full user object, v2 dropped activeShopUid entirely.
      // Anything older than v3 is dropped rather than migrated — the user
      // simply signs in again once.
      migrate: () => ({ name: null, activeShopUid: null, accessToken: null, refreshToken: null }),
    },
  ),
);

/** True when a usable session exists. Read this rather than testing fields ad hoc. */
export function useIsAuthenticated(): boolean {
  return useAuthStore((state) => state.accessToken !== null && state.name !== null);
}
