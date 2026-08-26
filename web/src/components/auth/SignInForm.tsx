import { useLogin } from '@api/auth';
import { AuthInput } from '@components/auth/AuthInput';
import { Button } from '@components/ui/Button';
import { LockIcon, PhoneIcon } from '@components/ui/icons';
import { isSafeRedirect } from '@lib/session';
import { useAuthStore } from '@stores/auth';
import { type FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

/** The sign-in half of `AuthCard`. */
export function SignInForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setSession = useAuthStore((state) => state.setSession);
  const login = useLogin();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const next = searchParams.get('next');
  const redirectTo = isSafeRedirect(next) ? next : '/dashboard';

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    login.mutate(
      { phone: phone.trim(), password },
      {
        onSuccess: (response) => {
          const data = response.data;
          if (!data) return;
          setSession(data.user.name, data.tokens);
          void navigate(redirectTo, { replace: true });
        },
      },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-100">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-400">Sign in to your account</p>
      </div>

      <AuthInput
        label="Phone number"
        icon={<PhoneIcon />}
        type="tel"
        name="phone"
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
        required
        autoComplete="tel"
        placeholder="01XXXXXXXXX"
      />

      <div>
        <AuthInput
          label="Password"
          icon={<LockIcon />}
          type="password"
          name="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          autoComplete="current-password"
          placeholder="••••••••"
        />
        <Link
          to="/forgot-password"
          className="mt-1.5 inline-block text-xs font-medium text-slate-500 hover:text-indigo-400"
        >
          Forgot password?
        </Link>
      </div>

      <Button
        type="submit"
        size="lg"
        fullWidth
        isLoading={login.isPending}
        loadingText="Signing in…"
        className="mt-1 shadow-lg shadow-indigo-500/25 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/30"
      >
        Sign in
      </Button>

      <p className="text-center text-xs text-slate-500 md:hidden">
        Don&apos;t have a shop yet?{' '}
        <Link to="/signup" className="font-medium text-indigo-400 hover:text-indigo-300">
          Create one
        </Link>
      </p>
    </form>
  );
}
