import { Button } from '@components/ui/Button';
import { clearStoredSession } from '@lib/session';
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
  const [open, setOpen] = useState(false);

  if (!name) return null;

  const handleSignOut = () => {
    setOpen(false);
    // Drops the tokens from memory and removes the localStorage entry.
    clearStoredSession();
    void navigate('/', { replace: true });
  };

  return (
    <div className="relative">
      <Button
        variant="plain"
        size="icon"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
        className="rounded-full bg-linear-to-br from-indigo-500 to-purple-600 font-bold text-white shadow-md shadow-indigo-500/20 hover:scale-105"
      >
        {initials(name)}
      </Button>

      {open ? (
        <>
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

            <Button
              variant="ghost"
              size="lg"
              fullWidth
              role="menuitem"
              onClick={handleSignOut}
              className="justify-start rounded-none hover:text-rose-400"
            >
              Sign out
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
