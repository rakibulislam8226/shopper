import { RedirectAuthenticated } from '@components/auth/RedirectAuthenticated';
import { AppLayout } from '@components/layout/AppLayout';
import { AuthPage } from '@pages/AuthPage';
import { ForgotPasswordPage } from '@pages/ForgotPasswordPage';
import { LandingPage } from '@pages/LandingPage';
import { SignupDocumentsPage } from '@pages/SignupDocumentsPage';
import { Navigate, type RouteObject } from 'react-router-dom';

// Type-only import: erased at build time, so it creates no runtime cycle.
import { type RoutePaths } from '../index';

/**
 * Routes rendered inside the public shell (navbar + footer).
 *
 * `/login` and `/signup` both render `AuthPage`, which reads the active side
 * from the URL — that keeps the two routes real and bookmarkable while
 * letting the sign-in/sign-up slider animate instead of hard-navigating.
 * `AuthPage` handles its own authenticated-redirect; the landing page uses
 * `RedirectAuthenticated` for the same reason (marketing copy is wasted on a
 * signed-in visitor).
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
        { path: routes.login, element: <AuthPage /> },
        { path: routes.signup, element: <AuthPage /> },
        { path: `${routes.signup}/documents`, element: <SignupDocumentsPage /> },
        { path: routes.forgotPassword, element: <ForgotPasswordPage /> },

        // Catch-all. Without it an unknown path — a stale bookmark, a typo, a
        // route that used to exist — matches nothing and React Router renders
        // a blank page.
        { path: '*', element: <Navigate to={routes.home} replace /> },
      ],
    },
  ];
}
