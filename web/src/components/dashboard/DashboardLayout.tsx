import { Button } from '@components/ui/Button';
import { useUiStore } from '@stores/ui';
import { useState } from 'react';
import { Outlet } from 'react-router-dom';

import { Sidebar } from './Sidebar';

/** Widths the sidebar and the content offset must agree on. */
const SIDEBAR_WIDTH = 'lg:w-64';
const RAIL_WIDTH = 'lg:w-16';

/**
 * Shell for every authenticated screen.
 *
 * Two independent pieces of navigation state, because they answer different
 * questions. Below `lg` the sidebar is a transient drawer — opened, used,
 * gone — so the layout owns it in local state. At `lg` and above it is a
 * standing preference (full panel or icon rail) that lives in the persisted
 * UI store and survives reloads.
 */
export function DashboardLayout() {
  // Closed by `onNavigate` on every link inside it, so a route change never
  // leaves the drawer hanging open.
  const [drawerOpen, setDrawerOpen] = useState(false);
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);

  return (
    <div className="min-h-screen bg-surface text-slate-100">
      {/* Desktop sidebar: full panel, or an icon rail when collapsed. */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden transition-[width] duration-200 ease-out lg:block ${
          collapsed ? RAIL_WIDTH : SIDEBAR_WIDTH
        }`}
      >
        <Sidebar collapsed={collapsed} />

        {/* Straddles the sidebar's right edge, so it reads as the handle that
            moves it rather than another topbar control. Translating by half
            its own width keeps it centred on the border at either width. */}
        <Button
          variant="secondary"
          size="icon"
          onClick={toggleSidebar}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          className="absolute top-[3.25rem] right-0 z-40 h-8 w-8 translate-x-1/2 rounded-lg border-slate-700 bg-elevated shadow-lg"
        >
          <PanelIcon collapsed={collapsed} />
        </Button>
      </aside>

      {/* Mobile drawer */}
      {drawerOpen ? (
        <div className="lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 z-40 cursor-default bg-scrim backdrop-blur-sm"
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 shadow-2xl">
            <Sidebar onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div
        className={`transition-[padding] duration-200 ease-out ${
          collapsed ? 'lg:pl-16' : 'lg:pl-64'
        }`}
      >
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-edge bg-surface-overlay px-4 backdrop-blur-md sm:px-6">
          {/* Below lg the sidebar is a drawer, so the trigger lives here. */}
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
            className="lg:hidden"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </Button>

          <div className="flex-1" />

          <span className="hidden items-center gap-2 rounded-full border border-edge-strong bg-panel px-3 py-1 text-xs text-slate-400 sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden="true" />
            Preview build
          </span>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/** Panel glyph whose chevron points the way the sidebar will move. */
function PanelIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      {collapsed ? <path d="M9 6l6 6-6 6" /> : <path d="M15 6l-6 6 6 6" />}
    </svg>
  );
}
