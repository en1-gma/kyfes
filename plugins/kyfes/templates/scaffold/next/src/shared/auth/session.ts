import { queryOptions, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { http, isApiError } from '@/shared/api';
import { env } from '@/shared/config/env';
import { safeRedirect } from '@/shared/lib';
import { SessionSchema, type Session } from './session.schema';

export const sessionKeys = {
  all: ['session'] as const,
};

/** GET /auth/me: single source of truth for user and permissions. `null` = anonymous. */
export const sessionQueryOptions = queryOptions({
  queryKey: sessionKeys.all,
  queryFn: async ({ signal }): Promise<Session | null> => {
    try {
      const { data } = await http.get('/auth/me', { signal });
      return SessionSchema.parse(data);
    } catch (error) {
      if (isApiError(error) && error.status === 401) return null;
      throw error;
    }
  },
  staleTime: 5 * 60_000,
});

export function useSession() {
  return useQuery(sessionQueryOptions);
}

export function invalidateSession(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: sessionKeys.all });
}

/** Absolute URL of a BFF endpoint (full-page navigation, not a Next route). */
function apiUrl(path: string): URL {
  return new URL(`${env.API_BASE_URL.replace(/\/$/, '')}${path}`, window.location.origin);
}

/** Full-page navigation to the BFF login (OIDC code + PKCE happens server-side). */
export function login(returnTo: string = '/'): void {
  const target = safeRedirect(returnTo);
  const url = apiUrl('/auth/login');
  url.searchParams.set('returnTo', target);
  window.location.assign(url.href);
}

export async function logout(queryClient: QueryClient, redirectTo = '/'): Promise<void> {
  try {
    await http.post('/auth/logout');
  } finally {
    queryClient.clear();
    // Full reload: drops every in-memory state of the previous user.
    window.location.assign(new URL(safeRedirect(redirectTo), window.location.origin).href);
  }
}

export function useLogout(): () => Promise<void> {
  const queryClient = useQueryClient();
  return () => logout(queryClient);
}
