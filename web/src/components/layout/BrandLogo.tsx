import logo from '../../assets/logo.jpeg';
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
      title={iconOnly ? 'Shopper' : undefined}
    >
      <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl shadow-md shadow-indigo-500/20 transition-transform duration-200 group-hover:scale-105">
        <img src={logo} alt="" className="h-full w-full object-cover" />
      </span>
      <span
        className={
          iconOnly
            ? 'sr-only'
            : 'text-lg font-bold tracking-tight text-text-primary transition-colors group-hover:text-indigo-400'
        }
      >
        Shopper
      </span>
    </NavLink>
  );
}
