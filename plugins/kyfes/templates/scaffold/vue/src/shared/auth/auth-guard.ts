import { isCancelledError, type QueryClient } from '@tanstack/vue-query'
import type { NavigationGuard } from 'vue-router'
import { isApiError } from '@/shared/api'
import { ensureSession, login } from './session'

declare module 'vue-router' {
  interface RouteMeta {
    /** Routes reachable without a session (e.g. error pages). Everything else requires authentication. */
    public?: boolean
  }
}

/** "Requires authentication": no session → BFF login with returnTo = requested path. */
export function createAuthGuard(queryClient: QueryClient): NavigationGuard {
  return async (to) => {
    if (to.meta.public) return true
    try {
      await ensureSession(queryClient)
      return true
    } catch (error) {
      if (isApiError(error) && error.status === 401) {
        // Usually a no-op: the http 401 handler has already started the login with this same target.
        login(to.fullPath)
        return false
      }
      // The 401 handler cleared the cache (cancelling this fetch) while the login redirect starts.
      if (isCancelledError(error)) return false
      throw error
    }
  }
}
