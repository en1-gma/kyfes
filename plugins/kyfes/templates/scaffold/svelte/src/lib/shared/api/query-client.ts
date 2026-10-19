import { QueryClient } from '@tanstack/svelte-query';
import { browser } from '$app/env';
import { isApiError } from './api-error';

const MAX_RETRIES = 2;

/** No retry on 4xx; at most 2 retries on 5xx and network errors. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
	if (isApiError(error) && !error.isRetryable) return false;
	return failureCount < MAX_RETRIES;
}

export function createAppQueryClient(): QueryClient {
	return new QueryClient({
		defaultOptions: {
			queries: {
				enabled: browser,
				staleTime: 30_000,
				gcTime: 5 * 60_000,
				retry: shouldRetry,
				// Back-office data: refetch on focus only if stale (default behaviour), keep it on.
				refetchOnWindowFocus: true
			},
			mutations: { retry: false }
		}
	});
}
