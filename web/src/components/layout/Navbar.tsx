import { ButtonLink } from '@components/ui/Button';
import { NavLink } from 'react-router-dom';

import { BrandLogo } from './BrandLogo';

const NAV_ITEMS = [{ label: 'Home', path: '/' }] as const;

const linkClasses = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all duration-200 ${
    isActive
      ? 'border border-edge bg-elevated/90 font-semibold text-brand-text shadow-sm'
      : 'text-slate-400 hover:bg-panel/50 hover:text-slate-200'
  }`;

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-edge bg-surface-overlay backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <BrandLogo />

        <nav className="flex items-center gap-1 sm:gap-2">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.path} to={item.path} end={item.path === '/'} className={linkClasses}>
              {item.label}
            </NavLink>
          ))}

          <span className="mx-1 h-5 w-px bg-edge-strong" aria-hidden="true" />

          <ButtonLink to="/login">Sign in</ButtonLink>
        </nav>
      </div>
    </header>
  );
}
