import {
	useQueryClient,
	type MutationCacheNotifyEvent,
	type QueryClient,
	type QueryCacheNotifyEvent
} from '@tanstack/svelte-query';
import { navigating } from '$app/state';
import { env } from '$lib/shared/config';
import {
	AUTH_ENDPOINTS,
	enableSessionRefresh,
	http,
	isApiError,
	onUnauthorized
} from '$lib/shared/api';
import { safeRedirect } from '$lib/shared/lib';
import { invalidateSession, sessionKeys } from './session';

let leaving = false;

/** The BFF login URL: the OIDC flow (code + PKCE) happens on the server. */
export function loginUrl(returnTo: string): string {
	return `${env.API_BASE_URL}${AUTH_ENDPOINTS.login}?returnTo=${encodeURIComponent(safeRedirect(returnTo))}`;
}

/** During a client navigation the target URL (not the old page) is the one to return to. */
function currentPath(): string {
	const url = navigating.to?.url ?? new URL(window.location.href);
	return url.pathname + url.search;
}

/** Full-page navigation to the BFF login (never client-side routing). */
export function login(returnTo: string = currentPath()): void {
	if (leaving) return;
	leaving = true;
	window.location.assign(loginUrl(returnTo));
}

export async function logout(queryClient: QueryClient, redirectTo = '/'): Promise<void> {
	try {
		await http.post(AUTH_ENDPOINTS.logout);
	} finally {
		queryClient.clear();
		window.location.assign(safeRedirect(redirectTo));
	}
}

/** For components: `const logout = useLogout(); onclick={logout}`. */
export function useLogout(): () => Promise<void> {
	const queryClient = useQueryClient();
	return () => logout(queryClient);
}

/** A query or mutation that has just failed with 403. */
function failedWithForbidden(event: QueryCacheNotifyEvent | MutationCacheNotifyEvent): boolean {
	return (
		event.type === 'updated' &&
		event.action.type === 'error' &&
		isApiError(event.action.error) &&
		event.action.error.isForbidden
	);
}

/**
 * Wires the HTTP client to the session: 401 → single-flight POST /auth/refresh and one retry,
 * and only if the refresh fails drop the session and go to login; 403 on any query/mutation →
 * permissions may have changed, refetch the session. Without a refresh endpoint in the BFF,
 * pass `{ refresh: false }`.
 */
export function installAuthHandlers(
	queryClient: QueryClient,
	{ refresh = true }: { refresh?: boolean } = {}
): () => void {
	enableSessionRefresh(refresh);
	onUnauthorized(() => {
		queryClient.removeQueries({ queryKey: sessionKeys.all });
		login();
	});
	const unsubscribeQueries = queryClient.getQueryCache().subscribe((event) => {
		if (failedWithForbidden(event) && event.query.queryKey[0] !== sessionKeys.all[0]) {
			void invalidateSession(queryClient);
		}
	});
	const unsubscribeMutations = queryClient.getMutationCache().subscribe((event) => {
		if (failedWithForbidden(event)) void invalidateSession(queryClient);
	});
	return () => {
		enableSessionRefresh(false);
		onUnauthorized(undefined);
		unsubscribeQueries();
		unsubscribeMutations();
	};
}
