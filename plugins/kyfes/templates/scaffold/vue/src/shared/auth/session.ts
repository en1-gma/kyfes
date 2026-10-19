import { queryOptions, useQuery, useQueryClient, type QueryClient } from '@tanstack/vue-query'
import { computed } from 'vue'
import { env } from '@/shared/config/env'
import { AUTH_ENDPOINTS, getParsed, http } from '@/shared/api'
import { safeRedirect } from '@/shared/lib/safe-redirect'
import { SessionSchema, type Session } from './session.schema'

export const sessionKeys = {
  all: ['session'] as const,
  me: () => [...sessionKeys.all, 'me'] as const,
}

/** GET /auth/me: the only source of truth for user and permissions. */
export function sessionQueryOptions() {
  return queryOptions({
    queryKey: sessionKeys.me(),
    queryFn: ({ signal }) => getParsed(AUTH_ENDPOINTS.me, SessionSchema, { signal }),
    staleTime: 5 * 60_000,
    retry: false,
  })
}

export function useSession() {
  const query = useQuery(sessionQueryOptions())
  const user = computed(() => query.data.value?.user)
  return { ...query, user }
}

/**
 * Loads the session outside components, e.g. in route guards. Cached data is reused only while fresh:
 * an invalidated session (403 → permissions may have changed) is fetched again before deciding.
 */
export function ensureSession(queryClient: QueryClient): Promise<Session> {
  return queryClient.fetchQuery(sessionQueryOptions())
}

let redirecting = false

/** Full-page navigation to the BFF login; `returnTo` always goes through safeRedirect. */
export function login(returnTo: string): void {
  if (redirecting) return
  redirecting = true
  const target = encodeURIComponent(safeRedirect(returnTo))
  window.location.assign(`${env.API_BASE_URL}${AUTH_ENDPOINTS.login}?returnTo=${target}`)
}

/** POST /auth/logout, wipe every cached query, back to the app root. */
export async function logout(queryClient: QueryClient): Promise<void> {
  try {
    await http.post(AUTH_ENDPOINTS.logout)
  } finally {
    queryClient.clear()
    window.location.assign(safeRedirect('/'))
  }
}

export function useLogout() {
  const queryClient = useQueryClient()
  return () => logout(queryClient)
}
