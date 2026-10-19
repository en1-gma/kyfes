import type { QueryClient } from '@tanstack/vue-query'
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
        login(to.fullPath)
        return false
      }
      throw error
    }
  }
}
