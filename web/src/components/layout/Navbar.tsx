import { ArrowRightIcon } from '@components/ui/icons';
import { Link, NavLink } from 'react-router-dom';

import { BrandLogo } from './BrandLogo';
import { ThemeToggle } from './ThemeToggle';

const NAV_ITEMS = [{ label: 'Home', path: '/' }] as const;

const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
  `text-xs font-semibold tracking-[0.12em] uppercase transition-colors duration-150 ${
    isActive ? 'text-text-primary' : 'text-text-muted hover:text-text-primary'
  }`;

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-edge bg-surface-overlay backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <BrandLogo />

        <nav className="flex items-center gap-8">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.path} to={item.path} end={item.path === '/'} className={navLinkClasses}>
              {item.label}
            </NavLink>
          ))}
          <Link
            to="/login"
            className="text-xs font-semibold tracking-[0.12em] text-text-muted uppercase transition-colors duration-150 hover:text-text-primary"
          >
            Sign in
          </Link>

          <ThemeToggle />

          <Link
            to="/signup"
            className="group inline-flex items-center gap-3 rounded-full bg-brand py-1.5 pr-1.5 pl-5 text-xs font-semibold tracking-[0.12em] text-white uppercase shadow-sm shadow-brand/30 transition-colors duration-200 hover:bg-brand-hover"
          >
            Sign up
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white transition-transform duration-200 group-hover:translate-x-0.5">
              <ArrowRightIcon className="h-3.5 w-3.5" strokeWidth={2.25} />
            </span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
