import { useAuthStore } from '@stores/auth';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

/** First letters of the user's name, for the avatar disc. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join('') || '?';
}

/** Signed-in navbar control: avatar button opening a profile panel. */
export function UserMenu() {
  const navigate = useNavigate();
  const name = useAuthStore((state) => state.name);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [open, setOpen] = useState(false);

  if (!name) return null;

  const handleSignOut = () => {
    setOpen(false);
    clearSession();
    void navigate('/', { replace: true });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white shadow-md shadow-indigo-500/20 transition-transform hover:scale-105"
      >
        {initials(name)}
      </button>

      {open ? (
        <>
          {/* Click-away layer — closes the panel without a document listener. */}
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />

          <div
            role="menu"
            className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-xl"
          >
            <div className="border-b border-slate-800 px-4 py-3">
              <p className="truncate text-sm font-semibold text-slate-100">{name}</p>
              <p className="text-xs text-slate-400">Signed in</p>
            </div>

            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              className="w-full px-4 py-2.5 text-left text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-rose-400"
            >
              Sign out
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
