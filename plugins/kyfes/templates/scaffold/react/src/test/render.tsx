import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { render, type RenderResult } from '@testing-library/react';
import { Suspense, type ReactElement } from 'react';
import { I18nextProvider } from 'react-i18next';
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router';
import { mockSessions, setMockUser, type MockUser } from '@/mocks/data';
import { createQueryClient } from '@/shared/api';
import { sessionKeys } from '@/shared/auth';
import { i18n } from '@/shared/i18n';
import { AbilityProvider } from '@/shared/rbac';

export function createTestQueryClient(): QueryClient {
  return createQueryClient({ queries: { retry: false, gcTime: Infinity, staleTime: Infinity } });
}

interface Options {
  user?: MockUser;
  route?: string;
  path?: string;
  routes?: RouteObject[];
  queryClient?: QueryClient;
}

/**
 * Renders `ui` with the real providers: QueryClient seeded with the session of `user`
 * (permissions = rules of that mock user), CASL ability, i18n, memory router.
 */
export function renderWithProviders(
  ui: ReactElement,
  {
    user = 'manager',
    route = '/',
    path = '/',
    routes = [],
    queryClient = createTestQueryClient(),
  }: Options = {},
): RenderResult & { queryClient: QueryClient } {
  setMockUser(user);
  queryClient.setQueryData(sessionKeys.me(), mockSessions[user]);
  const router = createMemoryRouter([{ path, element: ui }, ...routes], { initialEntries: [route] });
  const result = render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <AbilityProvider>
          <Suspense fallback={null}>
            <RouterProvider router={router} />
          </Suspense>
        </AbilityProvider>
      </I18nextProvider>
    </QueryClientProvider>,
  );
  return { ...result, queryClient };
}
