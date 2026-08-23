import { RedirectAuthenticated } from '@components/auth/RedirectAuthenticated';
import { RequireAuth } from '@components/auth/RequireAuth';
import { DashboardLayout } from '@components/dashboard/DashboardLayout';
import { AppLayout } from '@components/layout/AppLayout';
import { AuditPage } from '@pages/dashboard/AuditPage';
import { OrganizationsPage } from '@pages/dashboard/OrganizationsPage';
import { OverviewPage } from '@pages/dashboard/OverviewPage';
import { ProductsPage } from '@pages/dashboard/ProductsPage';
import { SalesPage } from '@pages/dashboard/SalesPage';
import { SettingsPage } from '@pages/dashboard/SettingsPage';
import { StaffPage } from '@pages/dashboard/StaffPage';
import { HealthPage } from '@pages/HealthPage';
import { LandingPage } from '@pages/LandingPage';
import { LoginPage } from '@pages/LoginPage';
import { createBrowserRouter } from 'react-router-dom';

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      {
        path: '/',
        element: (
          <RedirectAuthenticated>
            <LandingPage />
          </RedirectAuthenticated>
        ),
      },
      { path: '/health', element: <HealthPage /> },
      { path: '/login', element: <LoginPage /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { path: '/dashboard', element: <OverviewPage /> },
          { path: '/dashboard/products', element: <ProductsPage /> },
          { path: '/dashboard/sales', element: <SalesPage /> },
          { path: '/dashboard/staff', element: <StaffPage /> },
          { path: '/dashboard/organizations', element: <OrganizationsPage /> },
          { path: '/dashboard/audit', element: <AuditPage /> },
          { path: '/dashboard/settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
]);
