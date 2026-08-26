import { BrandMarkIcon } from '@components/ui/icons';
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
        <BrandMarkIcon />
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
