import { Outlet } from 'react-router-dom';

import { Navbar } from './Navbar';

/**
 * Application shell: fixed navbar plus a flexible main region. Pages fill the
 * remaining height via `flex-1` instead of subtracting the navbar height
 * themselves, so the navbar can change size without touching every page.
 */
export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <Navbar />
      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  );
}
