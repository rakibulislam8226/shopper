import { RequireAuth } from '@components/auth/RequireAuth';
import { DashboardLayout } from '@components/dashboard/DashboardLayout';
import { AuditPage } from '@pages/dashboard/AuditPage';
import { OrganizationsPage } from '@pages/dashboard/OrganizationsPage';
import { OverviewPage } from '@pages/dashboard/OverviewPage';
import { ProductsPage } from '@pages/dashboard/ProductsPage';
import { SalesPage } from '@pages/dashboard/SalesPage';
import { SettingsPage } from '@pages/dashboard/SettingsPage';
import { StaffPage } from '@pages/dashboard/StaffPage';
import { type RouteObject } from 'react-router-dom';

// Type-only import: erased at build time, so it creates no runtime cycle.
import { type RoutePaths } from '../index';

/**
 * Routes rendered inside the authenticated panel (sidebar shell).
 *
 * `RequireAuth` sits above the layout rather than on each route, so a new
 * section is protected by being added to this list — there is no per-route
 * flag anyone can forget to set.
 */
export function createDashboardRoutes(routes: RoutePaths): RouteObject[] {
  return [
    {
      element: <RequireAuth />,
      children: [
        {
          element: <DashboardLayout />,
          children: [
            { path: routes.dashboard.root, element: <OverviewPage /> },
            { path: routes.dashboard.products, element: <ProductsPage /> },
            { path: routes.dashboard.sales, element: <SalesPage /> },
            { path: routes.dashboard.staff, element: <StaffPage /> },
            { path: routes.dashboard.organizations, element: <OrganizationsPage /> },
            { path: routes.dashboard.audit, element: <AuditPage /> },
            { path: routes.dashboard.settings, element: <SettingsPage /> },
          ],
        },
      ],
    },
  ];
}
