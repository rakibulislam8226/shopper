import { router } from '@router/index';
import { RouterProvider } from 'react-router-dom';

import { AppProviders } from './providers';

export default function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
