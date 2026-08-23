import { useIsAuthenticated } from '@stores/auth';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

/**
 * Gate for authenticated areas. Renders the nested routes when a session
 * exists, otherwise sends the visitor to sign in with a `next` pointing back
 * here so they land where they were headed.
 *
 * This is a UX guard, not a security boundary — it only decides what renders.
 * The API is what actually enforces access, and it must reject an
 * unauthenticated request no matter what the client chose to draw.
 */
export function RequireAuth() {
  const isAuthenticated = useIsAuthenticated();
  const location = useLocation();

  if (!isAuthenticated) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }

  return <Outlet />;
}
