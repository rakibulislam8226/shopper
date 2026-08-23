import { AppLayout } from '@components/layout/AppLayout';
import { HealthPage } from '@pages/HealthPage';
import { LandingPage } from '@pages/LandingPage';
import { LoginPage } from '@pages/LoginPage';
import { createBrowserRouter } from 'react-router-dom';

/** Every route renders inside the shared AppLayout shell. */
export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/health', element: <HealthPage /> },
      { path: '/login', element: <LoginPage /> },
    ],
  },
]);
