import { useIsAuthenticated } from '@stores/auth';
import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Public pages a signed-in user has no reason to see. The landing page is
 * marketing and the login form is already satisfied, so both send an
 * authenticated visitor to their real home instead.
 */
export function RedirectAuthenticated({ children }: { children: ReactNode }) {
  const isAuthenticated = useIsAuthenticated();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
}
