import { createAppQueryClient } from '$lib/shared/api';
import type { LayoutLoad } from './$types';

/**
 * Client-rendered app (data via axios + TanStack Query with the session cookie); the
 * adapter-node server still renders the shell, adds the CSP nonce and the security headers.
 */
export const ssr = false;
export const prerender = false;

export const load: LayoutLoad = () => {
	return { queryClient: createAppQueryClient() };
};
