import { Suspense, useState } from 'react';
import { RouterProvider } from 'react-router/dom';
import { createQueryClient } from '@/shared/api';
import { Spinner } from '@/shared/ui';
import { AppProviders } from './providers';
import { createAppRouter } from './router';

export function App() {
  const [queryClient] = useState(() => createQueryClient());
  const [router] = useState(createAppRouter);
  return (
    <AppProviders queryClient={queryClient}>
      <Suspense fallback={<Spinner />}>
        <RouterProvider router={router} />
      </Suspense>
    </AppProviders>
  );
}
