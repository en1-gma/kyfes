import { QueryClient, type DefaultOptions } from '@tanstack/react-query';
import { isApiError } from './api-error';

const MAX_RETRIES = 2;

/**
 * Retry only what may succeed a moment later: network errors/timeouts (status 0) and 5xx, at most twice.
 * Never 4xx, never an invalid payload (ZodError) or a programming error: the answer will not change.
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (!isApiError(error)) return false;
  if (error.status !== 0 && error.status < 500) return false;
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
