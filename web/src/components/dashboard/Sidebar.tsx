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
      className="h-4.5 w-4.5 shrink-0"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** Up to two initials for the avatar disc. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join('') || '?';
}

/**
 * Dashboard sidebar: brand, grouped navigation, and the signed-in user.
 *
 * `collapsed` narrows it to an icon-only rail — labels, section headings and
 * badges drop out, everything centres, and each row keeps a `title` so a
 * hover still names it. Rendered three ways by the layout: full on desktop,
 * as a rail when collapsed, and full inside the mobile drawer (which passes
 * `onNavigate` so following a link closes it).
 */
export function Sidebar({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const navigate = useNavigate();
  const name = useAuthStore((state) => state.name);

  const handleSignOut = () => {
    onNavigate?.();
    clearStoredSession();
    void navigate('/', { replace: true });
  };

  const linkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex items-center rounded-lg text-nav transition-colors duration-150 ${
      collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2'
    } ${
      isActive
        ? 'bg-brand-soft font-semibold text-brand-text ring-1 ring-brand-ring'
        : 'text-slate-400 hover:bg-panel hover:text-slate-200'
    }`;

  return (
    <div className="flex h-full flex-col border-r border-edge bg-card">
      <div
        className={`flex h-16 shrink-0 items-center border-b border-edge ${
          collapsed ? 'justify-center px-0' : 'px-5'
        }`}
      >
        <BrandLogo iconOnly={collapsed} />
      </div>

      <nav className={`flex-1 space-y-6 overflow-y-auto py-5 ${collapsed ? 'px-2' : 'px-3'}`}>
        {NAV_SECTIONS.map((section) => (
          <div key={section.heading}>
            {collapsed ? (
              // A heading has nothing to say without its labels; the divider
              // keeps the grouping readable in the rail.
              <div className="mx-2 mb-2 border-t border-edge" aria-hidden="true" />
            ) : (
              <p className="mb-2 px-3 text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">
                {section.heading}
              </p>
            )}

            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.path === '/dashboard'}
                    onClick={onNavigate}
                    className={linkClasses}
                    title={collapsed ? item.label : undefined}
                  >
                    <NavIcon>{item.icon}</NavIcon>
                    {collapsed ? (
                      // The icon alone is not an accessible name.
                      <span className="sr-only">{item.label}</span>
                    ) : (
                      <>
                        <span className="flex-1">{item.label}</span>
                        {item.badge ? (
                          <span className="rounded-full bg-elevated px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                            {item.badge}
                          </span>
                        ) : null}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div
        className={`flex shrink-0 border-t border-edge ${
          collapsed ? 'flex-col items-center gap-2 p-3' : 'items-center gap-3 p-4'
        }`}
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white"
          title={collapsed ? (name ?? undefined) : undefined}
        >
          {initials(name ?? '')}
        </span>

        {collapsed ? null : (
          <div className="min-w-0 flex-1">
            <p className="truncate text-nav text-slate-200">{name}</p>
          </div>
        )}

        {/* Icon-only, so it carries an accessible name and a hover tooltip —
            a bare glyph tells a screen reader (and a new user) nothing. */}
        <Button
          variant="plain"
          size="icon"
          onClick={handleSignOut}
          aria-label="Sign out"
          title="Sign out"
          className="shrink-0 rounded-lg text-slate-500 hover:bg-panel hover:text-rose-400"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4.5 w-4.5"
            aria-hidden="true"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
        </Button>
      </div>
    </div>
  );
}
