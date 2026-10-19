import { HttpResponse, http } from 'msw';
import * as z from 'zod';
import {
  ORDERS_ENDPOINT,
  ORDER_SUBJECT,
  type Order,
  OrderCreateSchema,
  OrderPatchSchema,
  orderSubject,
} from '@features/orders';
import { AUTH_ENDPOINTS } from '@shared/api';
import { Action, type Actions, type AppSubject, buildAbility } from '@shared/rbac';
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

/** Il mock applica le stesse regole CASL della sessione, campo per campo, come farebbe il backend. */
function can(action: Actions, subject: AppSubject, body: object = {}): boolean {
  const ability = buildAbility(MOCK_SESSIONS[currentUser].rules);
  const fields = Object.keys(body);
  if (fields.length === 0) return ability.can(action, subject);
  return fields.every((field) => ability.can(action, subject, field));
}

function validationError(error: z.ZodError) {
  return errorResponse(400, 'VALIDATION_ERROR', 'Invalid input', {
    fieldErrors: z.flattenError(error).fieldErrors,
  });
}

async function readBody(request: Request): Promise<object> {
  const body: unknown = await request.json().catch(() => null);
  return typeof body === 'object' && body !== null ? body : {};
}

export const handlers = [
  http.get(`${API}${AUTH_ENDPOINTS.me}`, () => HttpResponse.json(MOCK_SESSIONS[currentUser])),
  http.post(`${API}${AUTH_ENDPOINTS.logout}`, () => new HttpResponse(null, { status: 204 })),
  http.post(`${API}${AUTH_ENDPOINTS.refresh}`, () => new HttpResponse(null, { status: 204 })),

  http.get(`${API}${ORDERS_ENDPOINT}/stats`, () => {
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

  http.get(`${API}${ORDERS_ENDPOINT}`, ({ request }) => {
    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get('limit') ?? 20) || 20, 100);
    const offset = Number(url.searchParams.get('cursor') ?? 0) || 0;
    const status = url.searchParams.get('status');
    const filtered = status ? orders.filter((o) => o.status === status) : orders;
    const items = filtered.slice(offset, offset + limit);
    const next = offset + limit;
    return HttpResponse.json({ items, nextCursor: next < filtered.length ? String(next) : null, limit });
  }),

  http.get(`${API}${ORDERS_ENDPOINT}/:id`, ({ params }) => {
    const order = orders.find((o) => o.id === params['id']);
    return order ? HttpResponse.json(order) : errorResponse(404, 'NOT_FOUND', 'Order not found');
  }),

  http.post(`${API}${ORDERS_ENDPOINT}`, async ({ request }) => {
    const body = await readBody(request);
    if (!can(Action.Create, ORDER_SUBJECT, body)) return errorResponse(403, 'FORBIDDEN', 'Not allowed');
    const parsed = OrderCreateSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);
    const order: Order = {
      ...parsed.data,
      id: crypto.randomUUID(),
      number: `ORD-${String(orders.length + 1000).padStart(4, '0')}`,
      createdAt: new Date().toISOString(),
    };
    orders = [order, ...orders];
    return HttpResponse.json(order, { status: 201 });
  }),

  http.patch(`${API}${ORDERS_ENDPOINT}/:id`, async ({ params, request }) => {
    const current = orders.find((o) => o.id === params['id']);
    if (!current) return errorResponse(404, 'NOT_FOUND', 'Order not found');
    const body = await readBody(request);
    if (!can(Action.Update, orderSubject(current), body))
      return errorResponse(403, 'FORBIDDEN', 'Not allowed');
    const parsed = OrderPatchSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);
    const updated: Order = { ...current, ...parsed.data };
    orders = orders.map((o) => (o.id === updated.id ? updated : o));
    return HttpResponse.json(updated);
  }),

  http.delete(`${API}${ORDERS_ENDPOINT}/:id`, ({ params }) => {
    const order = orders.find((o) => o.id === params['id']);
    if (!order) return errorResponse(404, 'NOT_FOUND', 'Order not found');
    // Regola invertita del manager: gli ordini spediti non si eliminano.
    if (!can(Action.Delete, orderSubject(order))) return errorResponse(403, 'FORBIDDEN', 'Not allowed');
    orders = orders.filter((o) => o.id !== order.id);
    return new HttpResponse(null, { status: 204 });
  }),
];

/** Override pronti per i test degli stati di errore (`server.use(...)`). */
export const errorHandlers = {
  ordersServerError: http.get(`${API}${ORDERS_ENDPOINT}`, () => errorResponse(500, 'INTERNAL', 'Boom')),
  ordersForbidden: http.get(`${API}${ORDERS_ENDPOINT}`, () => errorResponse(403, 'FORBIDDEN', 'Not allowed')),
  unauthenticated: http.get(`${API}${AUTH_ENDPOINTS.me}`, () =>
    errorResponse(401, 'UNAUTHENTICATED', 'Login required'),
  ),
};
