import { waitFor } from '@testing-library/vue'
import { http, HttpResponse } from 'msw/http'
import { describe, expect, it } from 'vitest'
import { createDb, sessions } from '@/mocks/data'
import { createHandlers, errorBody } from '@/mocks/handlers'
import { server } from '@/mocks/node'
import { createTestQueryClient, withSetup } from '@/test/render'
import { useCreateOrder, useDeleteOrder } from './orders.mutations'
import {
  orderKeys,
  orderQueryOptions,
  ordersInfiniteQueryOptions,
  orderStatsQueryOptions,
} from './orders.queries'

describe('orders queries', () => {
  it('keys come from the factory', () => {
    expect(orderKeys.list({ limit: 10 })).toEqual(['orders', 'list', { limit: 10 }])
    expect(orderKeys.detail('1')).toEqual(['orders', 'detail', '1'])
  })

  it('loads the list with cursor pagination and parses it with Zod', async () => {
    const queryClient = createTestQueryClient()
    const options = ordersInfiniteQueryOptions({ limit: 20 })
    const data = await queryClient.fetchInfiniteQuery(options)
    expect(data.pages[0]?.items).toHaveLength(20)
    expect(data.pages[0]?.nextCursor).toBe('20')
    const next = await createTestQueryClient().fetchInfiniteQuery({ ...options, pages: 3 })
    expect(next.pages).toHaveLength(3)
    expect(next.pages[2]?.nextCursor).toBeNull()
  })

  it('loads detail and stats', async () => {
    const queryClient = createTestQueryClient()
    const first = createDb().orders[0]
    const order = await queryClient.fetchQuery(orderQueryOptions(first?.id ?? ''))
    expect(order.number).toBe(first?.number)
    const stats = await queryClient.fetchQuery(orderStatsQueryOptions())
    expect(stats.months.length).toBeGreaterThan(0)
  })

  it('rejects responses that do not match the schema', async () => {
    server.use(
      http.get('/api/orders/stats', () => HttpResponse.json({ months: [{ month: 'x', total: 'y' }] })),
    )
    const queryClient = createTestQueryClient()
    await expect(queryClient.fetchQuery(orderStatsQueryOptions())).rejects.toThrow()
  })
})

describe('orders mutations', () => {
  it('create invalidates the lists', async () => {
    const queryClient = createTestQueryClient()
    const listKey = ordersInfiniteQueryOptions().queryKey
    await queryClient.fetchInfiniteQuery(ordersInfiniteQueryOptions())
    const { result } = await withSetup(() => useCreateOrder(), { queryClient, session: sessions.manager })

    const created = await result.mutateAsync({ customerName: 'Nuovo Cliente', status: 'draft', total: 10 })
    expect(created.customerName).toBe('Nuovo Cliente')
    expect(queryClient.getQueryState(listKey)?.isInvalidated).toBe(true)
    expect(queryClient.getQueryData(orderKeys.detail(created.id))).toEqual(created)
  })

  it('delete is optimistic and rolls back on error', async () => {
    const db = createDb()
    server.use(...createHandlers('manager', db))
    const queryClient = createTestQueryClient()
    const options = ordersInfiniteQueryOptions()
    await queryClient.fetchInfiniteQuery(options)
    // Newest shipped order: it is on the first page (default sort -createdAt).
    const shipped = db.orders.filter((o) => o.status === 'shipped').at(-1)
    const { result } = await withSetup(() => useDeleteOrder(), { queryClient, session: sessions.manager })

    const ids = () =>
      queryClient.getQueryData(options.queryKey)?.pages.flatMap((p) => p.items.map((o) => o.id))
    // The server answers only when released, so the optimistic state can be observed.
    let release = () => {}
    const gate = new Promise<void>((resolve) => (release = resolve))
    server.use(
      http.delete('/api/orders/:id', async () => {
        await gate
        return errorBody(403)
      }),
    )
    const pending = result.mutateAsync(shipped?.id ?? '').catch((e: unknown) => e)
    await waitFor(() => expect(ids()).not.toContain(shipped?.id))
    release()
    expect(await pending).toMatchObject({ status: 403 })
    expect(ids()).toContain(shipped?.id)
  })

  it('concurrent deletes: the first one failing does not bring back the second row', async () => {
    const db = createDb()
    server.use(...createHandlers('manager', db))
    const queryClient = createTestQueryClient()
    const options = ordersInfiniteQueryOptions()
    await queryClient.fetchInfiniteQuery(options)
    const [first, second] = queryClient.getQueryData(options.queryKey)?.pages[0]?.items ?? []
    const { result: deleteA } = await withSetup(() => useDeleteOrder(), { queryClient })
    const { result: deleteB } = await withSetup(() => useDeleteOrder(), { queryClient })

    const ids = () =>
      queryClient.getQueryData(options.queryKey)?.pages.flatMap((p) => p.items.map((o) => o.id))
    const gates = new Map<string, () => void>()
    server.use(
      http.delete('/api/orders/:id', async ({ params }) => {
        await new Promise<void>((resolve) => gates.set(String(params.id), resolve))
        return params.id === first?.id ? errorBody(500) : new HttpResponse(null, { status: 204 })
      }),
    )
    const pendingA = deleteA.mutateAsync(first?.id ?? '').catch((e: unknown) => e)
    const pendingB = deleteB.mutateAsync(second?.id ?? '')
    await waitFor(() => expect(gates.size).toBe(2))
    expect(ids()).not.toContain(first?.id)
    expect(ids()).not.toContain(second?.id)

    gates.get(first?.id ?? '')?.()
    expect(await pendingA).toMatchObject({ status: 500 })
    expect(ids()).not.toContain(second?.id)
    expect(queryClient.getQueryState(options.queryKey)?.isInvalidated).toBe(true)

    gates.get(second?.id ?? '')?.()
    await pendingB
    expect(ids()).not.toContain(second?.id)
  })
})
