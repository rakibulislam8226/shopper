import { BrandLogo } from '@components/layout/BrandLogo';
import { Button } from '@components/ui/Button';
import { clearStoredSession } from '@lib/session';
import { useAuthStore } from '@stores/auth';
import { type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

import { NAV_SECTIONS } from './navigation';

/** Wrapper giving every nav glyph the same size and stroke. */
function NavIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px] shrink-0"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join('') || '?';
}

const linkClasses = ({ isActive }: { isActive: boolean }) =>
  `group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-150 ${
    isActive
      ? 'bg-indigo-500/10 font-semibold text-indigo-300 ring-1 ring-indigo-500/20'
      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
  }`;

/**
 * Dashboard sidebar. Rendered twice by the layout — once fixed for desktop,
 * once inside the mobile drawer — so it takes `onNavigate` to let the drawer
 * close itself when a link is followed.
 */
export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate();
  const name = useAuthStore((state) => state.name);

  const handleSignOut = () => {
    onNavigate?.();
    clearStoredSession();
    void navigate('/', { replace: true });
  };

  return (
    <div className="flex h-full flex-col border-r border-slate-800/80 bg-slate-900/40">
      <div className="flex h-16 shrink-0 items-center border-b border-slate-800/80 px-5">
        <BrandLogo />
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {NAV_SECTIONS.map((section) => (
          <div key={section.heading}>
            <p className="mb-2 px-3 text-[11px] font-semibold tracking-wider text-slate-600 uppercase">
              {section.heading}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.path === '/dashboard'}
                    onClick={onNavigate}
                    className={linkClasses}
                  >
                    <NavIcon>{item.icon}</NavIcon>
                    <span className="flex-1">{item.label}</span>
                    {item.badge ? (
                      <span className="rounded-full bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                        {item.badge}
                      </span>
                    ) : null}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-slate-800/80 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white">
            {initials(name ?? '')}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-200">{name}</p>
            <p className="text-xs text-slate-500">Signed in</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="md"
          fullWidth
          onClick={handleSignOut}
          className="mt-1 justify-start"
        >
          Sign out
        </Button>
      </div>
    </div>
  );
}
