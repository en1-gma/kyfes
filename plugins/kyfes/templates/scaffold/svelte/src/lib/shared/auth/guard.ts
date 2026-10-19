import type { QueryClient } from '@tanstack/svelte-query';
import { isApiError } from '$lib/shared/api';
import { login } from './auth';
import { sessionQueryOptions } from './session';
import type { Session } from './session.schema';

/**
 * Route guard for load functions: resolves with the session, or starts the login
 * (full navigation) and never resolves, so the protected page is never rendered.
 */
export async function requireAuth(queryClient: QueryClient, url: URL): Promise<Session> {
	try {
		return await queryClient.ensureQueryData(sessionQueryOptions());
	} catch (error) {
		if (isApiError(error) && error.isUnauthorized) {
			login(url.pathname + url.search);
			return new Promise<never>(() => {});
		}
		throw error;
	}
}
