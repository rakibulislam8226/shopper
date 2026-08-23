import { NavLink } from 'react-router-dom';

const YEAR = new Date().getFullYear();

/** Site footer. Kept in the layout so every page ends the same way. */
export function Footer() {
  return (
    <footer className="border-t border-slate-800/80 px-6 py-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-xs text-slate-500 sm:flex-row">
        <p>© {YEAR} shopper — multi-tenant shop management.</p>

        <nav className="flex items-center gap-5">
          <NavLink to="/" className="transition-colors hover:text-slate-300">
            Home
          </NavLink>
          <NavLink to="/health" className="transition-colors hover:text-slate-300">
            Status
          </NavLink>
          <NavLink to="/login" className="transition-colors hover:text-slate-300">
            Sign in
          </NavLink>
        </nav>
      </div>
    </footer>
  );
}
