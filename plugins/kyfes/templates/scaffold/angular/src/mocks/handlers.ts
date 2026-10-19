import { HttpResponse, http } from 'msw';
import { type Order, OrderInputSchema } from '@features/orders';
import { MOCK_SESSIONS, type MockUserKey, seedOrders } from './data';

const API = '/api';

let currentUser: MockUserKey = 'manager';
let orders: Order[] = seedOrders();

/** Sceglie l'utente simulato (test: `useMockUser('viewer')`; browser: `?mockUser=viewer`). */
export function useMockUser(user: MockUserKey): void {
  currentUser = user;
}

export function resetMockDb(): void {
  orders = seedOrders();
  currentUser = 'manager';
}

let correlationSeq = 0;

/** Errore nel formato del backend: `{ code, message, correlationId }`. */
export function errorResponse(status: number, code: string, message: string, extra: object = {}) {
  correlationSeq += 1;
  return HttpResponse.json(
    { code, message, correlationId: `mock-${status}-${correlationSeq}`, ...extra },
    { status },
  );
}

function canWrite(): boolean {
  return currentUser === 'manager';
}

export const handlers = [
  http.get(`${API}/auth/me`, () => HttpResponse.json(MOCK_SESSIONS[currentUser])),
  http.post(`${API}/auth/logout`, () => new HttpResponse(null, { status: 204 })),
  http.post(`${API}/auth/refresh`, () => new HttpResponse(null, { status: 204 })),

  http.get(`${API}/orders/stats`, () => {
    const byMonth = new Map<string, number>();
    for (const order of orders) {
      const month = order.createdAt.slice(0, 7);
      byMonth.set(month, Math.round(((byMonth.get(month) ?? 0) + order.total) * 100) / 100);
    }
    const months = [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, total]) => ({ month, total }));
    return HttpResponse.json({ months });
  }),

  http.get(`${API}/orders`, ({ request }) => {
    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get('limit') ?? 20) || 20, 100);
    const offset = Number(url.searchParams.get('cursor') ?? 0) || 0;
    const status = url.searchParams.get('status');
    const filtered = status ? orders.filter((o) => o.status === status) : orders;
    const items = filtered.slice(offset, offset + limit);
    const next = offset + limit;
    return HttpResponse.json({ items, nextCursor: next < filtered.length ? String(next) : null, limit });
  }),

  http.get(`${API}/orders/:id`, ({ params }) => {
    const order = orders.find((o) => o.id === params['id']);
    return order ? HttpResponse.json(order) : errorResponse(404, 'NOT_FOUND', 'Order not found');
  }),

  http.post(`${API}/orders`, async ({ request }) => {
    if (!canWrite()) return errorResponse(403, 'FORBIDDEN', 'Not allowed');
    const parsed = OrderInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(400, 'VALIDATION_ERROR', 'Invalid input', {
        fieldErrors: parsed.error.flatten().fieldErrors,
      });
    }
    const order: Order = {
      ...parsed.data,
      id: crypto.randomUUID(),
      number: `ORD-${String(orders.length + 1000).padStart(4, '0')}`,
      createdAt: new Date().toISOString(),
    };
    orders = [order, ...orders];
    return HttpResponse.json(order, { status: 201 });
  }),

  http.put(`${API}/orders/:id`, async ({ params, request }) => {
    if (!canWrite()) return errorResponse(403, 'FORBIDDEN', 'Not allowed');
    const index = orders.findIndex((o) => o.id === params['id']);
    const current = orders[index];
    if (!current) return errorResponse(404, 'NOT_FOUND', 'Order not found');
    const parsed = OrderInputSchema.safeParse(await request.json());
    if (!parsed.success) return errorResponse(400, 'VALIDATION_ERROR', 'Invalid input');
    const updated: Order = { ...current, ...parsed.data };
    orders = orders.map((o) => (o.id === updated.id ? updated : o));
    return HttpResponse.json(updated);
  }),

  http.delete(`${API}/orders/:id`, ({ params }) => {
    if (!canWrite()) return errorResponse(403, 'FORBIDDEN', 'Not allowed');
    const order = orders.find((o) => o.id === params['id']);
    if (!order) return errorResponse(404, 'NOT_FOUND', 'Order not found');
    if (order.status === 'shipped')
      return errorResponse(403, 'FORBIDDEN', 'Shipped orders cannot be deleted');
    orders = orders.filter((o) => o.id !== order.id);
    return new HttpResponse(null, { status: 204 });
  }),
];

/** Override pronti per i test degli stati di errore (`server.use(...)`). */
export const errorHandlers = {
  ordersServerError: http.get(`${API}/orders`, () => errorResponse(500, 'INTERNAL', 'Boom')),
  ordersForbidden: http.get(`${API}/orders`, () => errorResponse(403, 'FORBIDDEN', 'Not allowed')),
  unauthenticated: http.get(`${API}/auth/me`, () => errorResponse(401, 'UNAUTHENTICATED', 'Login required')),
};
