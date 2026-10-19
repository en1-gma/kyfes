import { VueQueryPlugin } from '@tanstack/vue-query'
import { fireEvent, render, screen } from '@testing-library/vue'
import { http, HttpResponse } from 'msw/http'
import { createPinia } from 'pinia'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { errorBody, sessionHandler } from '@/mocks/handlers'
import { server } from '@/mocks/node'
import { configureHttp } from '@/shared/api'
import { i18n, setLocale } from '@/shared/i18n'
import { createRbacPlugin } from '@/shared/rbac'
import { createTestQueryClient } from '@/test/render'
import App from './App.vue'
import { createUnauthorizedHandler } from './providers'
import { createAppRouter } from './router'
import { failedNavigation } from './router/navigation-state'

afterEach(() => {
  configureHttp({ onUnauthorized: undefined, refresh: false })
  failedNavigation.value = null
  vi.unstubAllGlobals()
})

describe('app bootstrap', () => {
  it.each([
    ['a 5xx', () => errorBody(500)],
    ['an invalid body', () => HttpResponse.json({ user: { id: 1 } })],
  ])(
    '/auth/me failing with %s on first load renders an error with Retry, not a blank page',
    async (_, reply) => {
      server.use(http.get('/api/auth/me', reply))
      await setLocale('it')
      const queryClient = createTestQueryClient()
      const router = createAppRouter(queryClient)
      await router.push('/orders').catch(() => undefined)
      render(App, {
        global: {
          plugins: [
            createPinia(),
            [VueQueryPlugin, { queryClient }],
            i18n,
            createRbacPlugin(queryClient),
            router,
          ],
        },
      })

      expect(await screen.findByRole('alert')).toHaveTextContent('Si è verificato un errore')
      server.use(sessionHandler('viewer'))
      await fireEvent.click(screen.getByRole('button', { name: 'Riprova' }))
      await vi.waitFor(() => expect(router.currentRoute.value.fullPath).toBe('/orders'))
      expect(screen.queryByRole('alert')).toBeNull()
    },
  )

  it('a 401 starts one login only, with returnTo = the navigation in progress', async () => {
    const assign = vi.fn()
    vi.stubGlobal('location', { ...window.location, pathname: '/old', search: '', hash: '', assign })
    const queryClient = createTestQueryClient()
    configureHttp({ refresh: true, onUnauthorized: createUnauthorizedHandler(queryClient) })
    server.use(sessionHandler(null))
    const router = createAppRouter(queryClient)
    await router.push('/orders?x=1')
    expect(assign).toHaveBeenCalledTimes(1)
    expect(assign).toHaveBeenCalledWith('/api/auth/login?returnTo=%2Forders%3Fx%3D1')
  })
})
