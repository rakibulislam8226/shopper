import { useAuthStore, useIsAuthenticated } from '@stores/auth';
import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

export function RedirectAuthenticated({ children }: { children: ReactNode }) {
  const isAuthenticated = useIsAuthenticated();
  const isSuperuser = useAuthStore((state) => state.isSuperuser);
  if (isAuthenticated) return <Navigate to={isSuperuser ? '/admin' : '/dashboard'} replace />;
  return children;
}
