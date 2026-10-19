import {
  MutationCache,
  QueryCache,
  QueryClient,
  defaultShouldDehydrateQuery,
  isServer,
} from '@tanstack/react-query';
import { isApiError } from './api-error';

export interface QueryClientHooks {
  /**
   * Called on a 403 (e.g. to invalidate the session: permissions may have changed).
   * Skipped for queries/mutations with `meta: { ignoreForbidden: true }` (the session query
   * itself: invalidating it on its own 403 would refetch it forever).
   */
  onForbidden?: () => void;
}

const MAX_RETRIES = 2;

/**
 * At most 2 retries, only for transient HTTP failures (network/timeout = status 0, or 5xx).
 * Never for 4xx, invalid payloads (ZodError) or other programming errors.
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (!isApiError(error)) return false;
  if (error.status !== 0 && error.status < 500) return false;
  return failureCount < MAX_RETRIES;
}

function ignoresForbidden(meta: Record<string, unknown> | undefined): boolean {
  return meta?.ignoreForbidden === true;
}

export function createQueryClient(hooks: QueryClientHooks = {}): QueryClient {
  const onError = (error: unknown, meta: Record<string, unknown> | undefined) => {
    if (isApiError(error) && error.isForbidden && !ignoresForbidden(meta)) hooks.onForbidden?.();
  };
  return new QueryClient({
    queryCache: new QueryCache({ onError: (error, query) => onError(error, query.meta) }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => onError(error, mutation.meta),
    }),
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
