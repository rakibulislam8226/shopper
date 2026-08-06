import { NavLink } from 'react-router-dom';

import { BrandLogo } from './BrandLogo';

const NAV_ITEMS = [
  { label: 'Home', path: '/' },
  { label: 'Hello', path: '/hello' },
] as const;

const linkClasses = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all duration-200 ${
    isActive
      ? 'border border-slate-700/50 bg-slate-800/90 font-semibold text-indigo-400 shadow-sm'
      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
  }`;

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <BrandLogo />

        <nav className="flex items-center gap-1 sm:gap-2">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.path} to={item.path} end={item.path === '/'} className={linkClasses}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
