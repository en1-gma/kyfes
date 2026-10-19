import { QueryClient } from '@tanstack/svelte-query';
import { browser } from '$app/env';
import { isApiError } from './api-error';

const MAX_RETRIES = 2;

/**
 * At most 2 retries, only for ApiError on the network (status 0, timeout) or 5xx. Never on 4xx
 * nor on non-HTTP errors (ZodError on an invalid payload, bugs): repeating would not help.
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
	return isApiError(error) && error.isRetryable && failureCount < MAX_RETRIES;
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
