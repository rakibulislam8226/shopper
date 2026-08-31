import { RequireAuth } from '@components/auth/RequireAuth';
import { DashboardLayout } from '@components/dashboard/DashboardLayout';
import { AppearancePage } from '@pages/dashboard/AppearancePage';
import { AuditPage } from '@pages/dashboard/AuditPage';
import { EmployeesPage } from '@pages/dashboard/EmployeesPage';
import { OrganizationsPage } from '@pages/dashboard/OrganizationsPage';
import { OverviewPage } from '@pages/dashboard/OverviewPage';
import { ProductsPage } from '@pages/dashboard/ProductsPage';
import { SalesPage } from '@pages/dashboard/SalesPage';
import { ShopDocumentsPage } from '@pages/dashboard/ShopDocumentsPage';
import { ShopProfilePage } from '@pages/dashboard/ShopProfilePage';
import { Navigate, type RouteObject } from 'react-router-dom';

import { type RoutePaths } from '../index';

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
            { path: routes.dashboard.employees, element: <EmployeesPage /> },
            { path: routes.dashboard.organizations, element: <OrganizationsPage /> },
            { path: routes.dashboard.audit, element: <AuditPage /> },
            {
              path: routes.dashboard.settings.root,
              element: <Navigate to={routes.dashboard.settings.profile} replace />,
            },
            { path: routes.dashboard.settings.profile, element: <ShopProfilePage /> },
            { path: routes.dashboard.settings.documents, element: <ShopDocumentsPage /> },
            { path: routes.dashboard.settings.appearance, element: <AppearancePage /> },
          ],
        },
      ],
    },
  ];
}
