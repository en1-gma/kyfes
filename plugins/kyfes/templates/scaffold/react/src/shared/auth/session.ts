import { queryOptions, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { env } from '@/shared/config';
import { AUTH_ENDPOINTS, http } from '@/shared/api';
import { safeRedirect } from '@/shared/lib';
import { SessionSchema, type Session } from './session.schema';

export const sessionKeys = {
  all: ['session'] as const,
  me: () => [...sessionKeys.all, 'me'] as const,
};

/** The single source of truth for the user and their permissions (kyfes §3.1). */
export const sessionQueryOptions = queryOptions({
  queryKey: sessionKeys.me(),
  queryFn: async ({ signal }): Promise<Session> => {
    const { data } = await http.get<unknown>(AUTH_ENDPOINTS.me, { signal });
    return SessionSchema.parse(data);
  },
  staleTime: 5 * 60_000,
  retry: false,
});

export function useSession() {
  return useQuery(sessionQueryOptions);
}

/** Session already loaded (inside `RequireAuth`): `undefined` only outside the guard. */
export function useCurrentSession(): Session | undefined {
  return useQuery(sessionQueryOptions).data;
}

/** URL of the BFF login: the server runs OIDC (Authorization Code + PKCE) and sets the cookie. */
export function loginUrl(returnTo: string): string {
  return `${env.API_BASE_URL}${AUTH_ENDPOINTS.login}?returnTo=${encodeURIComponent(safeRedirect(returnTo))}`;
}

/** Full-page navigation to the BFF login (never an XHR: the IdP needs a top-level redirect). */
export function login(returnTo: string = currentPath()): void {
  window.location.assign(loginUrl(returnTo));
}

export function currentPath(): string {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

/** `POST /auth/logout` (XSRF header added by the client), wipe every cached query, go home. */
export async function logout(queryClient: QueryClient, redirectTo = '/'): Promise<void> {
  try {
    await http.post(AUTH_ENDPOINTS.logout);
  } finally {
    queryClient.clear();
    window.location.assign(safeRedirect(redirectTo));
  }
}

export function useLogout(): () => Promise<void> {
  const queryClient = useQueryClient();
  return () => logout(queryClient);
}

export function invalidateSession(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: sessionKeys.all });
}
