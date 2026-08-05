import { createBrowserRouter } from 'react-router-dom';

import { HelloPage } from './pages/HelloPage';
import { LandingPage } from './pages/LandingPage';

/**
 * Application router. A single placeholder route in Phase 0; feature routes are
 * registered here (or lazily, per feature) in later phases.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/hello',
    element: <HelloPage />,
  },
]);
