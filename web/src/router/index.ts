import { createBrowserRouter } from 'react-router-dom';

import { createDashboardRoutes } from './dashboard/router';
import { createPublicRoutes } from './public/router';

export const ROUTES = {
  home: '/',
  login: '/login',

  dashboard: {
    root: '/dashboard',
    products: '/dashboard/products',
    sales: '/dashboard/sales',
    staff: '/dashboard/staff',
    organizations: '/dashboard/organizations',
    audit: '/dashboard/audit',
    settings: '/dashboard/settings',
  },
} as const;

export type RoutePaths = typeof ROUTES;

export const router = createBrowserRouter([
  ...createPublicRoutes(ROUTES),
  ...createDashboardRoutes(ROUTES),
]);
