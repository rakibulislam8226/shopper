import { useLogin } from '@api/auth';
import { AuthInput } from '@components/auth/AuthInput';
import { AuthShell } from '@components/auth/AuthShell';
import { Button } from '@components/ui/Button';
import { LockIcon, PhoneIcon } from '@components/ui/icons';
import { useAuthStore, useIsAuthenticated } from '@stores/auth';
import { type FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

// Matches the public sign-in form's rejection message — not an access
// boundary, just avoids revealing whether an account is a superuser.
const NOT_AUTHORIZED_MESSAGE = 'Invalid phone number or password';

export function AdminLoginPage() {
  const navigate = useNavigate();
  const isAuthenticated = useIsAuthenticated();
  const isSuperuser = useAuthStore((state) => state.isSuperuser);
  const setSession = useAuthStore((state) => state.setSession);
  const login = useLogin();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  if (isAuthenticated) return <Navigate to={isSuperuser ? '/admin' : '/dashboard'} replace />;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    login.mutate(
      { phone: phone.trim(), password },
      {
        onSuccess: (response) => {
          const data = response.data;
          if (!data) return;

          if (!data.user.is_superuser) {
            toast.error(NOT_AUTHORIZED_MESSAGE);
            return;
          }

          setSession(data.user.name, data.tokens, data.user.active_shop?.uid, true);
          void navigate('/admin', { replace: true });
        },
      },
    );
  };

  return (
    <AuthShell title="Admin sign in" subtitle="Platform administration">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

        <Button type="submit" size="lg" fullWidth isLoading={login.isPending} loadingText="Signing in…">
          Sign in
        </Button>
      </form>
    </AuthShell>
  );
}
