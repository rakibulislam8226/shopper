import { createBrowserRouter } from 'react-router-dom';

import { Layout } from './components/Layout';
import { HelloPage } from './pages/HelloPage';
import { LandingPage } from './pages/LandingPage';

/**
 * Application router. Registered with a shared Layout header navbar.
 */
export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      {
        path: '/',
        element: <LandingPage />,
      },
      {
        path: '/hello',
        element: <HelloPage />,
      },
    ],
  },
]);
