import { useLogin } from '@api/auth';
import { BrandLogo } from '@components/layout/BrandLogo';
import { Button } from '@components/ui/Button';
import { isSafeRedirect } from '@lib/session';
import { useAuthStore, useIsAuthenticated } from '@stores/auth';
import { type FormEvent, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';

/** Phone + password sign-in. On success the session lands in the auth store. */
export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isAuthenticated = useIsAuthenticated();
  const setSession = useAuthStore((state) => state.setSession);
  const login = useLogin();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  // Where to land after signing in: back where the expired session left off.
  // Validated, because `next` comes from the URL and an unchecked value here
  // is an open redirect.
  const next = searchParams.get('next');
  const redirectTo = isSafeRedirect(next) ? next : '/dashboard';

  if (isAuthenticated) return <Navigate to={redirectTo} replace />;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    login.mutate(
      { phone: phone.trim(), password },
      {
        onSuccess: (response) => {
          const data = response.data;
          if (!data) return;
          // Only the display name is persisted — see the auth store.
          setSession(data.user.name, data.tokens);
          void navigate(redirectTo, { replace: true });
        },
      },
    );
  };

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <BrandLogo />
          <p className="text-sm text-slate-400">Sign in to your account</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-xl border border-edge-strong bg-card p-6"
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-400">Phone</span>
            <input
              type="tel"
              name="phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              required
              autoComplete="tel"
              autoFocus
              placeholder="01XXXXXXXXX"
              className="rounded-lg border border-edge-strong bg-inset px-3 py-2 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-indigo-500"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-400">Password</span>
            <input
              type="password"
              name="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="rounded-lg border border-edge-strong bg-inset px-3 py-2 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-indigo-500"
            />
          </label>

          <Button
            type="submit"
            size="lg"
            fullWidth
            isLoading={login.isPending}
            loadingText="Signing in…"
            className="mt-1"
          >
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}
