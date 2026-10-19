import { MutationCache, QueryCache, QueryClient } from '@tanstack/vue-query'
import { isApiError } from './api-error'

const MAX_RETRIES = 2

/**
 * At most 2 retries, only on network/timeout errors (status 0) and 5xx. Never on 4xx (the answer will
 * not change), nor on non-HTTP errors such as a ZodError (the same response would fail again).
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (!isApiError(error) || !error.isServerError) return false
  return failureCount < MAX_RETRIES
}

type QueryClientOptions = {
  /** Global error hook (e.g. 403 → invalidate the session, permissions may have changed). */
  onError?: (error: unknown, queryKey?: readonly unknown[]) => void
}

export function createQueryClient(opts: QueryClientOptions = {}): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({ onError: (error, query) => opts.onError?.(error, query.queryKey) }),
    mutationCache: new MutationCache({ onError: (error) => opts.onError?.(error) }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: shouldRetry,
        refetchOnWindowFocus: true,
      },
      mutations: {
        retry: false,
      },
    },
  })
}
