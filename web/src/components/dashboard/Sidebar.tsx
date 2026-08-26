import { BrandLogo } from '@components/layout/BrandLogo';
import { Button } from '@components/ui/Button';
import { ChevronDownIcon } from '@components/ui/icons';
import { cn } from '@lib/cn';
import { clearStoredSession } from '@lib/session';
import { useAuthStore } from '@stores/auth';
import { type ReactNode, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';

import { NAV_SECTIONS, type NavItem } from './navigation';

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

/** True if this item or any of its descendants matches the current path. */
function containsPath(item: NavItem, pathname: string): boolean {
  if (item.path && pathname === item.path) return true;
  return item.children?.some((child) => containsPath(child, pathname)) ?? false;
}

/**
 * Dashboard sidebar: brand, grouped navigation, and the signed-in user.
 *
 * A nav item is either a leaf (has `path`, navigates directly) or a parent
 * (has `children`, toggles open/closed and reveals an indented sub-list —
 * "Settings" expanding into "Shop details" / "Documents" is the current
 * example). A parent auto-expands when the current route is inside it, so
 * following a deep link never leaves its own section collapsed.
 *
 * `collapsed` narrows it to an icon-only rail — labels, section headings,
 * badges and nested children all drop out (there is nowhere to put a
 * sub-list on a rail), and each row keeps a `title` so a hover still names
 * it. Rendered three ways by the layout: full on desktop, as a rail when
 * collapsed, and full inside the mobile drawer (which passes `onNavigate` so
 * following a link closes it).
 */
export function Sidebar({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const name = useAuthStore((state) => state.name);

  const [openLabels, setOpenLabels] = useState<Set<string>>(
    () =>
      new Set(
        NAV_SECTIONS.flatMap((section) => section.items)
          .filter((item) => containsPath(item, location.pathname))
          .map((item) => item.label),
      ),
  );

  const toggleOpen = (label: string) =>
    setOpenLabels((current) => {
      const next = new Set(current);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });

  const handleSignOut = () => {
    onNavigate?.();
    clearStoredSession();
    void navigate('/', { replace: true });
  };

  const linkClasses = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center rounded-lg text-nav transition-colors duration-150',
      collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2',
      isActive
        ? 'bg-brand-soft font-semibold text-brand-text ring-1 ring-brand-ring'
        : 'text-text-muted hover:bg-panel hover:text-text-secondary',
    );

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
              <p className="mb-2 px-3 text-[11px] font-semibold tracking-[0.08em] text-text-muted uppercase">
                {section.heading}
              </p>
            )}

            <ul className="space-y-0.5">
              {section.items.map((item) =>
                item.children ? (
                  <NavParent
                    key={item.label}
                    item={item}
                    collapsed={collapsed}
                    open={openLabels.has(item.label)}
                    onToggle={() => toggleOpen(item.label)}
                    linkClasses={linkClasses}
                    onNavigate={onNavigate}
                  />
                ) : (
                  <NavLeaf
                    key={item.path}
                    item={item}
                    collapsed={collapsed}
                    linkClasses={linkClasses}
                    onNavigate={onNavigate}
                  />
                ),
              )}
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
            <p className="truncate text-nav text-text-secondary">{name}</p>
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
          className="shrink-0 rounded-lg text-text-muted hover:bg-panel hover:text-rose-400"
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

type LinkClasses = (props: { isActive: boolean }) => string;

function NavLeaf({
  item,
  collapsed,
  linkClasses,
  onNavigate,
  indented = false,
}: {
  item: NavItem;
  collapsed: boolean;
  linkClasses: LinkClasses;
  onNavigate?: () => void;
  indented?: boolean;
}) {
  if (!item.path) return null; // A leaf without a path is a data error, not renderable.

  return (
    <li>
      <NavLink
        to={item.path}
        end={item.path === '/dashboard'}
        onClick={onNavigate}
        className={linkClasses}
        title={collapsed ? item.label : undefined}
      >
        <span className={indented && !collapsed ? 'ml-7' : undefined}>
          <NavIcon>{item.icon}</NavIcon>
        </span>
        {collapsed ? (
          // The icon alone is not an accessible name.
          <span className="sr-only">{item.label}</span>
        ) : (
          <>
            <span className="flex-1">{item.label}</span>
            {item.badge ? (
              <span className="rounded-full bg-elevated px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
                {item.badge}
              </span>
            ) : null}
          </>
        )}
      </NavLink>
    </li>
  );
}

/**
 * An expandable row with nested children. Collapses to a single icon-only
 * leaf when the sidebar is a rail — a rail has nowhere to show a sub-list,
 * so it links straight to the parent's first child instead.
 */
function NavParent({
  item,
  collapsed,
  open,
  onToggle,
  linkClasses,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  open: boolean;
  onToggle: () => void;
  linkClasses: LinkClasses;
  onNavigate?: () => void;
}) {
  const children = item.children ?? [];

  if (collapsed) {
    const firstChild = children[0];
    if (!firstChild?.path) return null;
    return (
      <NavLeaf
        item={{ ...item, path: firstChild.path }}
        collapsed
        onNavigate={onNavigate}
        linkClasses={linkClasses}
      />
    );
  }

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-nav text-text-muted transition-colors duration-150 hover:bg-panel hover:text-text-secondary"
      >
        <NavIcon>{item.icon}</NavIcon>
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDownIcon
          className={cn(
            'h-3.5 w-3.5 shrink-0 transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>

      {/* Height-animated via a grid-rows trick (0fr ↔ 1fr) rather than
          conditionally rendering — a mount/unmount swap has no size to
          transition between, so it can only ever pop open or shut. */}
      <div
        className={cn(
          'grid transition-all duration-200 ease-out',
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        )}
      >
        <ul className="mt-0.5 space-y-0.5 overflow-hidden">
          {children.map((child) => (
            <NavLeaf
              key={child.path}
              item={child}
              collapsed={false}
              linkClasses={linkClasses}
              onNavigate={onNavigate}
              indented
            />
          ))}
        </ul>
      </div>
    </li>
  );
}
