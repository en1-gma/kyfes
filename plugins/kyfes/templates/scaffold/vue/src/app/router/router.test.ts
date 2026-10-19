import { describe, expect, it, vi } from 'vitest'
import { sessions } from '@/mocks/data'
import { sessionHandler } from '@/mocks/handlers'
import { server } from '@/mocks/node'
import { sessionKeys } from '@/shared/auth'
import { FORBIDDEN_ROUTE } from '@/shared/rbac'
import { createTestQueryClient } from '@/test/render'
import { createAppRouter } from './index'

describe('route guards (meta.permission)', () => {
  it('viewer can read orders but gets the 403 page on /orders/new, URL unchanged', async () => {
    const queryClient = createTestQueryClient()
    queryClient.setQueryData(sessionKeys.me(), sessions.viewer)
    const router = createAppRouter(queryClient)

    await router.push('/orders')
    expect(router.currentRoute.value.name).toBe('orders')

    await router.push('/orders/new')
    expect(router.currentRoute.value.name).toBe(FORBIDDEN_ROUTE)
    expect(router.currentRoute.value.fullPath).toBe('/orders/new')
  })

  it('manager can open /orders/new', async () => {
    const queryClient = createTestQueryClient()
    queryClient.setQueryData(sessionKeys.me(), sessions.manager)
    const router = createAppRouter(queryClient)
    await router.push('/orders/new')
    expect(router.currentRoute.value.name).toBe('order-new')
  })

  it('without a session the auth guard starts the BFF login with returnTo', async () => {
    server.use(sessionHandler(null))
    const assign = vi.fn()
    vi.stubGlobal('location', { ...window.location, assign, href: window.location.href })
    const router = createAppRouter(createTestQueryClient())
    await router.push('/orders?x=1')
    expect(assign).toHaveBeenCalledWith('/api/auth/login?returnTo=%2Forders%3Fx%3D1')
    vi.unstubAllGlobals()
  })
})
