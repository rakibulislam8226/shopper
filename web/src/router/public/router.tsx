import { RedirectAuthenticated } from '@components/auth/RedirectAuthenticated';
import { AppLayout } from '@components/layout/AppLayout';
import { HealthPage } from '@pages/HealthPage';
import { LandingPage } from '@pages/LandingPage';
import { LoginPage } from '@pages/LoginPage';
import { type RouteObject } from 'react-router-dom';

// Type-only import: erased at build time, so it creates no runtime cycle.
import { type RoutePaths } from '../index';

/**
 * Routes rendered inside the public shell (navbar + footer).
 *
 * The landing page and the login form are both wrapped in
 * `RedirectAuthenticated`: a signed-in visitor has no use for marketing copy
 * or a second sign-in, so both send them to the dashboard.
 */
export function createPublicRoutes(routes: RoutePaths): RouteObject[] {
  return [
    {
      element: <AppLayout />,
      children: [
        {
          path: routes.home,
          element: (
            <RedirectAuthenticated>
              <LandingPage />
            </RedirectAuthenticated>
          ),
        },
        { path: routes.health, element: <HealthPage /> },
        { path: routes.login, element: <LoginPage /> },
      ],
    },
  ];
}
