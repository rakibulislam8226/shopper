import { createBrowserRouter } from 'react-router-dom';

import { createAdminRoutes } from './admin/router';
import { createDashboardRoutes } from './dashboard/router';
import { createPublicRoutes } from './public/router';

export const ROUTES = {
  home: '/',
  login: '/login',
  signup: '/signup',
  forgotPassword: '/forgot-password',

  dashboard: {
    root: '/dashboard',
    products: '/dashboard/products',
    sales: '/dashboard/sales',
    employees: '/dashboard/employees',
    organizations: '/dashboard/organizations',
    audit: '/dashboard/audit',
    settings: {
      root: '/dashboard/settings',
      profile: '/dashboard/settings/profile',
      documents: '/dashboard/settings/documents',
      appearance: '/dashboard/settings/appearance',
    },
  },

  admin: {
    root: '/admin',
    shops: '/admin/shops',
    shopDetail: (shopUid: string) => `/admin/shops/${shopUid}`,
    users: '/admin/users',
    userDetail: (userUid: string) => `/admin/users/${userUid}`,
  },
} as const;

export type RoutePaths = typeof ROUTES;

export const router = createBrowserRouter([
  ...createPublicRoutes(ROUTES),
  ...createDashboardRoutes(ROUTES),
  ...createAdminRoutes(ROUTES),
]);
