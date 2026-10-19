import { VueQueryPlugin, type QueryClient } from '@tanstack/vue-query'
import { render, type RenderOptions } from '@testing-library/vue'
import { createPinia } from 'pinia'
import type { Component } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createQueryClient } from '@/shared/api'
import { sessionKeys, type Session } from '@/shared/auth'
import { i18n, loadNamespaces, registerNamespace, setLocale } from '@/shared/i18n'
import { createRbacPlugin } from '@/shared/rbac'
import { ORDERS_NAMESPACE, ordersLocales } from '@/features/orders'
import { routes } from '@/app/router/routes'

registerNamespace(ORDERS_NAMESPACE, ordersLocales)

export function createTestQueryClient(): QueryClient {
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } })
  return client
}

type Options = {
  session?: Session
  queryClient?: QueryClient
  props?: Record<string, unknown>
  stubs?: Record<string, unknown>
}

/** Renders with Pinia, TanStack Query, i18n (it), a memory router (app routes) and the ability built from `session`. */
export async function renderWithProviders(component: Component, opts: Options = {}) {
  const queryClient = opts.queryClient ?? createTestQueryClient()
  if (opts.session) queryClient.setQueryData(sessionKeys.me(), opts.session)
  await setLocale('it')
  await loadNamespaces([ORDERS_NAMESPACE])
  const router = createRouter({ history: createMemoryHistory(), routes })
  const options: RenderOptions<Component> = {
    props: opts.props,
    global: {
      plugins: [
        createPinia(),
        [VueQueryPlugin, { queryClient }],
        i18n,
        createRbacPlugin(queryClient),
        router,
      ],
      stubs: opts.stubs as Record<string, Component>,
    },
  }
  const result = render(component, options)
  return { ...result, queryClient, router }
}

/** Runs a composable inside a component with the providers (for query/mutation hooks). */
export async function withSetup<T>(composable: () => T, opts: Options = {}) {
  let result: T | undefined
  const Host = {
    setup() {
      result = composable()
      return () => null
    },
  }
  const rendered = await renderWithProviders(Host, opts)
  if (result === undefined) throw new Error('composable did not run')
  return { result, ...rendered }
}
