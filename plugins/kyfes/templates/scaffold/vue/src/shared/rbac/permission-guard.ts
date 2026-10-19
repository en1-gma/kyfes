import type { QueryClient } from '@tanstack/vue-query'
import type { NavigationGuard, RouteLocationRaw } from 'vue-router'
import { ensureSession } from '@/shared/auth'
import { buildAbility, type Actions, type SubjectName } from './ability'

export type RoutePermission = { action: Actions; subject: SubjectName }

declare module 'vue-router' {
  interface RouteMeta {
    /** Permission required to enter the route (checked by the permission guard). */
    permission?: RoutePermission
  }
}

/** Name of the route that renders the 403 page while keeping the requested URL. */
export const FORBIDDEN_ROUTE = 'forbidden'

/**
 * "Requires permission": reads `meta.permission` (on every matched record) and, if denied,
 * renders the 403 page at the same URL (no silent redirect).
 */
export function createPermissionGuard(queryClient: QueryClient): NavigationGuard {
  return async (to): Promise<true | RouteLocationRaw> => {
    const required = to.matched.flatMap((record) => (record.meta.permission ? [record.meta.permission] : []))
    if (required.length === 0) return true
    const session = await ensureSession(queryClient)
    const ability = buildAbility(session.rules)
    const allowed = required.every(({ action, subject }) => ability.can(action, subject))
    if (allowed) return true
    return {
      name: FORBIDDEN_ROUTE,
      params: { pathMatch: to.path.slice(1).split('/') },
      query: to.query,
      hash: to.hash,
      replace: true,
    }
  }
}
