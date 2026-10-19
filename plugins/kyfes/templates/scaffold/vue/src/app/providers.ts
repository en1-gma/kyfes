import { VueQueryPlugin, type QueryClient } from '@tanstack/vue-query'
import { createPinia } from 'pinia'
import type { App } from 'vue'
import { createQueryClient, isApiError } from '@/shared/api'
import { login, sessionKeys } from '@/shared/auth'
import { i18n, registerNamespace } from '@/shared/i18n'
import { createRbacPlugin } from '@/shared/rbac'
import { ORDERS_NAMESPACE, ordersLocales } from '@/features/orders'
import { navigationTarget } from './router/navigation-state'

/** Lazy i18n namespaces of every feature. */
export function registerFeatureNamespaces(): void {
  registerNamespace(ORDERS_NAMESPACE, ordersLocales)
}

export function createAppQueryClient(): QueryClient {
  const queryClient: QueryClient = createQueryClient({
    onError: (error, queryKey) => {
      // 403: permissions may have changed server side → refresh the session (and so the ability).
      const isSession = queryKey?.[0] === sessionKeys.all[0]
      if (isApiError(error) && error.status === 403 && !isSession) {
        void queryClient.invalidateQueries({ queryKey: sessionKeys.all })
      }
    },
  })
  return queryClient
}

/**
 * Session gone (401, refresh failed): wipe the cache and start the BFF login once. `returnTo` is the
 * navigation in progress, if any, not the page being left (the auth guard's own login is then a no-op).
 */
export function createUnauthorizedHandler(queryClient: QueryClient): () => void {
  return () => {
    queryClient.clear()
    login(navigationTarget())
  }
}

/** Installs Pinia, TanStack Query, vue-i18n and the CASL ability (synced with the session). */
export function installProviders(app: App, queryClient: QueryClient): void {
  app.use(createPinia())
  app.use(VueQueryPlugin, { queryClient })
  app.use(i18n)
  app.use(createRbacPlugin(queryClient))
}
