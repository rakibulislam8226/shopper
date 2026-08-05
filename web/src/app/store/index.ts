import { create } from 'zustand';

/**
 * Global client state lives here, composed from feature slices as the app
 * grows. The store is intentionally thin in Phase 0 — server state belongs in
 * TanStack Query, so only genuinely-global UI state is kept in Zustand.
 *
 * Add a slice by extending `AppState` and spreading its creator into `create`.
 */
export interface AppState {
  /** Layout shell state — collapsed navigation, shared across routes. */
  isNavCollapsed: boolean;
  setNavCollapsed: (collapsed: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isNavCollapsed: false,
  setNavCollapsed: (collapsed) => set({ isNavCollapsed: collapsed }),
}));
