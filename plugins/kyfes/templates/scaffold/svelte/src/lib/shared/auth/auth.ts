import { useQueryClient, type QueryClient } from '@tanstack/svelte-query';
import { navigating } from '$app/state';
import { env } from '$lib/shared/config';
import { http, isApiError, onUnauthorized } from '$lib/shared/api';
import { safeRedirect } from '$lib/shared/lib';
import { invalidateSession, sessionKeys } from './session';

let leaving = false;

/** The BFF login URL: the OIDC flow (code + PKCE) happens on the server. */
export function loginUrl(returnTo: string): string {
	return `${env.API_BASE_URL}/auth/login?returnTo=${encodeURIComponent(safeRedirect(returnTo))}`;
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
		await http.post('/auth/logout');
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

/**
 * Wires the HTTP client to the session: 401 → drop the session and go to login;
 * 403 on any query/mutation → permissions may have changed, refetch the session.
 */
export function installAuthHandlers(queryClient: QueryClient): () => void {
	onUnauthorized(() => {
		queryClient.removeQueries({ queryKey: sessionKeys.all });
		login();
	});
	const isForbidden = (error: unknown) => isApiError(error) && error.isForbidden;
	const unsubscribeQueries = queryClient.getQueryCache().subscribe((event) => {
		if (event.type !== 'updated' || event.action.type !== 'error') return;
		if (event.query.queryKey[0] === sessionKeys.all[0]) return;
		if (isForbidden(event.action.error)) void invalidateSession(queryClient);
	});
	const unsubscribeMutations = queryClient.getMutationCache().subscribe((event) => {
		if (
			event.type === 'updated' &&
			event.action.type === 'error' &&
			isForbidden(event.action.error)
		) {
			void invalidateSession(queryClient);
		}
	});
	return () => {
		onUnauthorized(undefined);
		unsubscribeQueries();
		unsubscribeMutations();
	};
}
