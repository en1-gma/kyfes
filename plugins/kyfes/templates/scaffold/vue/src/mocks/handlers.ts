import { http, HttpResponse } from 'msw/http'
import { OrderInputSchema, type Order } from '@/features/orders'
import { BROKEN_ORDER_ID, createDb, FORBIDDEN_ORDER_ID, sessions, type MockDb, type MockUser } from './data'

export const API = '/api'

export function errorBody(status: number) {
  const codes: Record<number, string> = {
    401: 'UNAUTHENTICATED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    500: 'INTERNAL',
  }
  return HttpResponse.json(
    { code: codes[status] ?? 'ERROR', message: `Mock error ${status}`, correlationId: `mock-${status}-0001` },
    { status },
  )
}

function compare(sort: string | null) {
  const desc = sort !== 'createdAt'
  return (a: Order, b: Order) => (desc ? -1 : 1) * a.createdAt.localeCompare(b.createdAt)
}

export function sessionHandler(user: MockUser | null) {
  return http.get(`${API}/auth/me`, () => (user ? HttpResponse.json(sessions[user]) : errorBody(401)))
}

/** Full mock API. `user` picks the session (manager: manage Order, viewer: read Order). */
export function createHandlers(user: MockUser = 'manager', db: MockDb = createDb()) {
  const find = (id: string | readonly string[] | undefined) => db.orders.find((o) => o.id === id)

  return [
    sessionHandler(user),
    http.post(`${API}/auth/logout`, () => new HttpResponse(null, { status: 204 })),
    http.post(`${API}/auth/refresh`, () => errorBody(401)),

    http.get(`${API}/orders/stats`, () => {
      const byMonth = new Map<string, number>()
      for (const o of db.orders) {
        const month = o.createdAt.slice(0, 7)
        byMonth.set(month, Math.round(((byMonth.get(month) ?? 0) + o.total) * 100) / 100)
      }
      const months = [...byMonth]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, total]) => ({ month, total }))
      return HttpResponse.json({ months })
    }),

    http.get(`${API}/orders`, ({ request }) => {
      const url = new URL(request.url)
      const limit = Number(url.searchParams.get('limit') ?? 20)
      const offset = Number(url.searchParams.get('cursor') ?? 0)
      const status = url.searchParams.get('status')
      const all = db.orders
        .filter((o) => !status || o.status === status)
        .sort(compare(url.searchParams.get('sort')))
      const items = all.slice(offset, offset + limit)
      const next = offset + limit < all.length ? String(offset + limit) : null
      return HttpResponse.json({ items, nextCursor: next, limit })
    }),

    http.get(`${API}/orders/:id`, ({ params }) => {
      if (params.id === FORBIDDEN_ORDER_ID) return errorBody(403)
      if (params.id === BROKEN_ORDER_ID) return errorBody(500)
      const order = find(params.id)
      return order ? HttpResponse.json(order) : errorBody(404)
    }),

    http.post(`${API}/orders`, async ({ request }) => {
      if (user !== 'manager') return errorBody(403)
      const parsed = OrderInputSchema.safeParse(await request.json())
      if (!parsed.success) return errorBody(400)
      const order: Order = {
        ...parsed.data,
        id: crypto.randomUUID(),
        number: `ORD-${1000 + db.orders.length}`,
        createdAt: new Date().toISOString(),
      }
      db.orders.unshift(order)
      return HttpResponse.json(order, { status: 201 })
    }),

    http.patch(`${API}/orders/:id`, async ({ params, request }) => {
      const order = find(params.id)
      if (!order) return errorBody(404)
      if (user !== 'manager' || order.status === 'shipped') return errorBody(403)
      const parsed = OrderInputSchema.partial().safeParse(await request.json())
      if (!parsed.success) return errorBody(400)
      Object.assign(order, parsed.data)
      return HttpResponse.json(order)
    }),

    http.delete(`${API}/orders/:id`, ({ params }) => {
      const order = find(params.id)
      if (!order) return errorBody(404)
      if (user !== 'manager' || order.status === 'shipped') return errorBody(403)
      db.orders.splice(db.orders.indexOf(order), 1)
      return new HttpResponse(null, { status: 204 })
    }),
  ]
}
