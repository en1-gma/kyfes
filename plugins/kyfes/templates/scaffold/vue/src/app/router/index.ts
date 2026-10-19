import type { QueryClient } from '@tanstack/vue-query'
import { createRouter, createWebHistory, type Router } from 'vue-router'
import { createAuthGuard } from '@/shared/auth'
import { i18n, loadNamespaces } from '@/shared/i18n'
import { createPermissionGuard } from '@/shared/rbac'
import { routes } from './routes'

declare module 'vue-router' {
  interface RouteMeta {
    /** i18n key of the page title. */
    titleKey?: string
  }
}

export function createAppRouter(queryClient: QueryClient): Router {
  const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes,
    scrollBehavior: (_to, _from, saved) => saved ?? { top: 0 },
  })

  router.beforeEach(createAuthGuard(queryClient))
  router.beforeEach(createPermissionGuard(queryClient))
  router.beforeResolve(async (to) => {
    await loadNamespaces(to.meta.namespaces ?? [])
  })
  router.afterEach((to) => {
    const { t } = i18n.global
    document.title = to.meta.titleKey
      ? t('common.app.pageTitle', { page: t(to.meta.titleKey) })
      : t('common.app.name')
  })

  return router
}
