import { AppLayout } from '@components/layout/AppLayout';
import { HelloPage } from '@pages/HelloPage';
import { LandingPage } from '@pages/LandingPage';
import { LoginPage } from '@pages/LoginPage';
import { createBrowserRouter } from 'react-router-dom';

/** Every route renders inside the shared AppLayout shell. */
export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/hello', element: <HelloPage /> },
      { path: '/login', element: <LoginPage /> },
    ],
  },
]);
