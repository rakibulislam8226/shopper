import { Button } from '@components/ui/Button';
import { useState } from 'react';
import { Outlet } from 'react-router-dom';

import { AdminSidebar } from './AdminSidebar';

const SIDEBAR_WIDTH = 'lg:w-64';

export function AdminLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface text-text-primary">
      <aside className={`fixed inset-y-0 left-0 z-30 hidden lg:block ${SIDEBAR_WIDTH}`}>
        <AdminSidebar />
      </aside>

      {drawerOpen ? (
        <div className="lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 z-40 cursor-default bg-scrim backdrop-blur-sm"
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 shadow-2xl">
            <AdminSidebar onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-edge bg-surface-overlay px-4 backdrop-blur-md sm:px-6">
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

          <span className="hidden items-center gap-2 rounded-full border border-edge-strong bg-panel px-3 py-1 text-xs text-text-muted sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
            Platform admin
          </span>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
