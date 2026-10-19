import { http, HttpResponse } from 'msw';
import { z } from 'zod';
// Model only (not the feature index): loading the components here would load them before
// the tests can mock their dependencies (e.g. next/navigation).
import { ORDER_FIELDS, OrderInputSchema, type Order } from '@/features/orders/model/orders.schema';
import { buildAbility, subject } from '@/shared/rbac';
import { db, mockState, sessions, type MockUser } from './data';

const API = '/api';

/** Error body with the backend contract: `{ code, message, correlationId, fieldErrors? }`. */
function apiError(
  status: number,
  code: string,
  message: string,
  fieldErrors?: Record<string, string[]>,
) {
  return HttpResponse.json(
    {
      code,
      message,
      correlationId: `mock-${code.toLowerCase()}-${status}`,
      ...(fieldErrors ? { fieldErrors } : {}),
    },
    { status },
  );
}

/** The mock server applies the same CASL rules it sends in /auth/me (conditions and fields). */
function ability() {
  return buildAbility(mockState.user ? sessions[mockState.user].rules : []);
}

/** Order fields present in a request body. */
function sentFields(body: unknown): string[] {
  if (typeof body !== 'object' || body === null) return [];
  return Object.keys(body).filter((k) => (ORDER_FIELDS as readonly string[]).includes(k));
}

// Create: the status is optional and defaults to draft (users without the field omit it).
const OrderCreateSchema = OrderInputSchema.extend({
  status: OrderInputSchema.shape.status.default('draft'),
});
const OrderPatchSchema = OrderInputSchema.partial();

function validationError(error: z.ZodError) {
  return apiError(422, 'VALIDATION_ERROR', 'Invalid order', z.flattenError(error).fieldErrors);
}

function monthlyStats() {
  const byMonth = new Map<string, { total: number; count: number }>();
  for (const o of db.orders) {
    const month = o.createdAt.slice(0, 7);
    const cur = byMonth.get(month) ?? { total: 0, count: 0 };
    byMonth.set(month, { total: cur.total + o.total, count: cur.count + 1 });
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, total: Math.round(v.total * 100) / 100, count: v.count }));
}

/** GET /api/auth/me for a given user (null = anonymous → 401). */
export function sessionHandler(user: MockUser | null) {
  return http.get(`${API}/auth/me`, () =>
    user ? HttpResponse.json(sessions[user]) : apiError(401, 'UNAUTHENTICATED', 'Not signed in'),
  );
}

export const handlers = [
  http.get(`${API}/auth/me`, () =>
    mockState.user
      ? HttpResponse.json(sessions[mockState.user])
      : apiError(401, 'UNAUTHENTICATED', 'Not signed in'),
  ),
  http.post(`${API}/auth/logout`, () => new HttpResponse(null, { status: 204 })),
  http.post(`${API}/auth/refresh`, () => apiError(401, 'UNAUTHENTICATED', 'No session')),
  http.get(`${API}/auth/login`, () => HttpResponse.redirect('/orders', 302)),

  http.get(`${API}/orders/stats`, () => HttpResponse.json({ months: monthlyStats() })),

  http.get(`${API}/orders`, ({ request }) => {
    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get('limit') ?? 20), 100);
    const offset = Number(url.searchParams.get('cursor') ?? 0);
    const status = url.searchParams.get('status');
    const rows = status ? db.orders.filter((o) => o.status === status) : db.orders;
    const items = rows.slice(offset, offset + limit);
    const next = offset + limit;
    return HttpResponse.json({
      items,
      nextCursor: next < rows.length ? String(next) : null,
      limit,
    });
  }),

  http.get(`${API}/orders/:id`, ({ params }) => {
    const order = db.orders.find((o) => o.id === params.id);
    return order ? HttpResponse.json(order) : apiError(404, 'NOT_FOUND', 'Order not found');
  }),

  http.post(`${API}/orders`, async ({ request }) => {
    const body: unknown = await request.json();
    const can = ability();
    if (
      can.cannot('create', 'Order') ||
      sentFields(body).some((field) => can.cannot('create', 'Order', field))
    ) {
      return apiError(403, 'FORBIDDEN', 'Not allowed');
    }
    const parsed = OrderCreateSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);
    const n = db.orders.length + 1;
    const order: Order = {
      id: crypto.randomUUID(),
      number: `ORD-${String(n).padStart(4, '0')}`,
      createdAt: new Date().toISOString(),
      ...parsed.data,
    };
    db.orders = [order, ...db.orders];
    return HttpResponse.json(order, { status: 201 });
  }),

  http.patch(`${API}/orders/:id`, async ({ params, request }) => {
    const index = db.orders.findIndex((o) => o.id === params.id);
    const current = db.orders[index];
    if (!current) return apiError(404, 'NOT_FOUND', 'Order not found');
    const body: unknown = await request.json();
    const can = ability();
    const record = subject('Order', { ...current });
    if (
      can.cannot('update', record) ||
      sentFields(body).some((field) => can.cannot('update', record, field))
    ) {
      return apiError(403, 'FORBIDDEN', 'Not allowed');
    }
    const parsed = OrderPatchSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);
    const updated = { ...current, ...parsed.data };
    db.orders[index] = updated;
    return HttpResponse.json(updated);
  }),

  http.delete(`${API}/orders/:id`, ({ params }) => {
    const current = db.orders.find((o) => o.id === params.id);
    if (!current) return apiError(404, 'NOT_FOUND', 'Order not found');
    if (ability().cannot('delete', subject('Order', { ...current }))) {
      return apiError(403, 'FORBIDDEN', 'Not allowed');
    }
    db.orders = db.orders.filter((o) => o.id !== params.id);
    return new HttpResponse(null, { status: 204 });
  }),
];

/** Overrides for error-state tests: `server.use(errorHandlers.ordersServerError)`. */
export const errorHandlers = {
  ordersForbidden: http.get(`${API}/orders`, () => apiError(403, 'FORBIDDEN', 'Not allowed')),
  ordersServerError: http.get(`${API}/orders`, () => apiError(500, 'INTERNAL', 'Unexpected error')),
};
