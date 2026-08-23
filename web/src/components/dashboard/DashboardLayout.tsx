import { Button } from '@components/ui/Button';
import { useState } from 'react';
import { Outlet } from 'react-router-dom';

import { Sidebar } from './Sidebar';

/**
 * Shell for every authenticated screen: a fixed sidebar on desktop, a slide-in
 * drawer below `lg`, and a topbar that carries the drawer trigger.
 *
 * Deliberately separate from the public `AppLayout` — the marketing pages and
 * the panel share a brand, not a chrome, and forcing one layout to serve both
 * ends in a thicket of conditionals.
 */
export function DashboardLayout() {
  // Closed by `onNavigate` on every link inside it, so a route change never
  // leaves the drawer hanging open.
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 lg:block">
        <Sidebar />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen ? (
        <div className="lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 z-40 cursor-default bg-slate-950/70 backdrop-blur-sm"
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 shadow-2xl">
            <Sidebar onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-800/80 bg-slate-950/80 px-4 backdrop-blur-md sm:px-6">
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

          <span className="hidden items-center gap-2 rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1 text-xs text-slate-400 sm:inline-flex">
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
