import { AuthCard, type AuthMode } from '@components/auth/AuthCard';
import { SignInForm } from '@components/auth/SignInForm';
import { SignUpForm } from '@components/auth/SignUpForm';
import { useIsAuthenticated } from '@stores/auth';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * Renders at both /login and /signup. Reading `mode` from the URL (rather
 * than local state) is what keeps the slide animation working across a real
 * navigation — React Router matches this component at a stable position for
 * both paths, so switching sides doesn't unmount either form.
 */
export function AuthPage() {
  const location = useLocation();
  const isAuthenticated = useIsAuthenticated();
  const mode: AuthMode = location.pathname.startsWith('/signup') ? 'signup' : 'signin';

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return <AuthCard mode={mode} signIn={<SignInForm />} signUp={<SignUpForm />} />;
}
