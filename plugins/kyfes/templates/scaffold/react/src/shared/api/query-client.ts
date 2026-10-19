import { QueryClient, type DefaultOptions } from '@tanstack/react-query';
import { isApiError } from './api-error';

const MAX_RETRIES = 2;

/** No retry on 4xx (the answer will not change); at most 2 retries on 5xx / network errors. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (isApiError(error) && error.isClientError) return false;
  return failureCount < MAX_RETRIES;
}

export function createQueryClient(overrides: DefaultOptions = {}): QueryClient {
  return new QueryClient({
    defaultOptions: {
      ...overrides,
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: shouldRetry,
        // Data of a back-office changes while the tab is in background: refetch, but only when stale.
        refetchOnWindowFocus: true,
        ...overrides.queries,
      },
      mutations: { retry: false, ...overrides.mutations },
    },
  });
}
