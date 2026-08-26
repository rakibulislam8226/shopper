import { NavLink } from 'react-router-dom';

/**
 * Wordmark + icon, linking home. `iconOnly` drops the wordmark for tight
 * spaces such as the collapsed sidebar rail, keeping the mark itself and its
 * accessible name.
 */
export function BrandLogo({ iconOnly = false }: { iconOnly?: boolean }) {
  return (
    <NavLink
      to="/"
      className="group flex items-center gap-2"
      title={iconOnly ? 'shopper' : undefined}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/20 transition-transform duration-200 group-hover:scale-105">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
          <path d="M3 6h18" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      </span>
      <span
        className={
          iconOnly
            ? 'sr-only'
            : 'text-lg font-bold tracking-tight text-slate-100 transition-colors group-hover:text-indigo-400'
        }
      >
        shopper
      </span>
    </NavLink>
  );
}
