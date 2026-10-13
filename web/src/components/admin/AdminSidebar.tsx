import { useAdminStats } from '@api/admin';
import { BrandLogo } from '@components/layout/BrandLogo';
import { Button } from '@components/ui/Button';
import { ScrollIcon, ShieldIcon, StoreIcon, UsersIcon } from '@components/ui/icons';
import { cn } from '@lib/cn';
import { clearStoredSession } from '@lib/session';
import { useAuthStore } from '@stores/auth';
import { NavLink, useNavigate } from 'react-router-dom';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join('') || '?';
}

const NAV_ITEMS = [
  { label: 'Overview', path: '/admin', icon: ScrollIcon },
  { label: 'Organizations', path: '/admin/shops', icon: StoreIcon },
  { label: 'Users', path: '/admin/users', icon: UsersIcon },
];

export function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate();
  const name = useAuthStore((state) => state.name);
  const { data: stats } = useAdminStats();
  const pendingCount = stats?.shops_by_status.pending ?? 0;

  const handleSignOut = () => {
    onNavigate?.();
    clearStoredSession();
    void navigate('/', { replace: true });
  };

  return (
    <div className="flex h-full flex-col border-r border-edge bg-card">
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-edge px-5">
        <BrandLogo />
        <span className="rounded-full border border-edge-strong bg-panel px-2 py-0.5 text-[10px] font-semibold tracking-wide text-text-muted uppercase">
          Admin
        </span>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-5">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/admin'}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-nav transition-colors duration-150',
                isActive
                  ? 'bg-brand-soft font-semibold text-brand-text ring-1 ring-brand-ring'
                  : 'text-text-muted hover:bg-panel hover:text-text-secondary',
              )
            }
          >
            <item.icon className="h-4.5 w-4.5 shrink-0" />
            <span className="flex-1">{item.label}</span>
            {item.path === '/admin/shops' && pendingCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-semibold text-white">
                {pendingCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="flex shrink-0 items-center gap-3 border-t border-edge p-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white">
          {initials(name ?? '')}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-nav text-text-secondary">{name}</p>
          <p className="flex items-center gap-1 truncate text-xs text-text-muted">
            <ShieldIcon className="h-3 w-3 shrink-0" />
            Superuser
          </p>
        </div>
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
