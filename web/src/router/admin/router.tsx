import { AdminLayout } from '@components/admin/AdminLayout';
import { RequireAuth } from '@components/auth/RequireAuth';
import { RequireSuperuser } from '@components/auth/RequireSuperuser';
import { AdminLoginPage } from '@pages/admin/AdminLoginPage';
import { AdminOverviewPage } from '@pages/admin/AdminOverviewPage';
import { AdminShopDetailPage } from '@pages/admin/AdminShopDetailPage';
import { AdminShopsPage } from '@pages/admin/AdminShopsPage';
import { AdminUserDetailPage } from '@pages/admin/AdminUserDetailPage';
import { AdminUsersPage } from '@pages/admin/AdminUsersPage';
import { type RouteObject } from 'react-router-dom';

import { type RoutePaths } from '../index';

// Unlisted on purpose: kept off `ROUTES` so nothing can build a link to it.
// A superuser is told this path out of band (see `AdminLoginPage`).
const ADMIN_LOGIN_PATH = '/login/_admn';

export function createAdminRoutes(routes: RoutePaths): RouteObject[] {
  return [
    { path: ADMIN_LOGIN_PATH, element: <AdminLoginPage /> },
    {
      element: <RequireAuth />,
      children: [
        {
          element: <RequireSuperuser />,
          children: [
            {
              element: <AdminLayout />,
              children: [
                { path: routes.admin.root, element: <AdminOverviewPage /> },
                { path: routes.admin.shops, element: <AdminShopsPage /> },
                { path: `${routes.admin.shops}/:shopUid`, element: <AdminShopDetailPage /> },
                { path: routes.admin.users, element: <AdminUsersPage /> },
                { path: `${routes.admin.users}/:userUid`, element: <AdminUserDetailPage /> },
              ],
            },
          ],
        },
      ],
    },
  ];
}
