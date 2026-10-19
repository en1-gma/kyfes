import {
  MutationCache,
  QueryCache,
  QueryClient,
  defaultShouldDehydrateQuery,
  isServer,
} from '@tanstack/react-query';
import { isApiError } from './api-error';

export interface QueryClientHooks {
  /** Called on any 403 (e.g. to invalidate the session: permissions may have changed). */
  onForbidden?: () => void;
}

const MAX_RETRIES = 2;

/** No retry on 4xx; at most 2 retries on 5xx / network errors. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (isApiError(error) && error.isClientError) return false;
  return failureCount < MAX_RETRIES;
}

export function createQueryClient(hooks: QueryClientHooks = {}): QueryClient {
  const onError = (error: unknown) => {
    if (isApiError(error) && error.status === 403) hooks.onForbidden?.();
  };
  return new QueryClient({
    queryCache: new QueryCache({ onError }),
    mutationCache: new MutationCache({ onError }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: shouldRetry,
        refetchOnWindowFocus: true,
      },
      mutations: { retry: false },
      dehydrate: {
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) || query.state.status === 'pending',
      },
    },
  });
}

let browserClient: QueryClient | undefined;

/** Server: a new client per request. Browser: a singleton (survives React suspense remounts). */
export function getQueryClient(hooks?: QueryClientHooks): QueryClient {
  if (isServer) return createQueryClient(hooks);
  browserClient ??= createQueryClient(hooks);
  return browserClient;
}
