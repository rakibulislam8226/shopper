import { useAuthStore } from '@stores/auth';
import { Navigate, Outlet } from 'react-router-dom';

/** UX gate only — the API re-checks `is_superuser` on every request regardless. */
export function RequireSuperuser() {
  const isSuperuser = useAuthStore((state) => state.isSuperuser);
  return isSuperuser ? <Outlet /> : <Navigate to="/dashboard" replace />;
}
