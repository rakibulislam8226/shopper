import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Interface preferences that belong to the person using the app, not to the
 * data. Persisted so a collapsed sidebar stays collapsed across reloads —
 * a layout choice that resets on every page load is worse than no choice.
 *
 * Kept apart from the auth store on purpose: signing out clears the session,
 * and a chrome preference has no business being wiped with it.
 */
export interface UiState {
  /** Desktop only. The mobile drawer is transient and tracked by the layout. */
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
    }),
    {
      name: 'shopper.ui',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }),
    },
  ),
);
