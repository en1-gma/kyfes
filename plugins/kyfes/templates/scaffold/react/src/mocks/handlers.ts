import { z } from 'zod';
import { delay, http, HttpResponse } from 'msw';
import {
  DEFAULT_ORDER_STATUS,
  ORDER_SORT,
  ORDER_SUBJECT,
  ORDERS_ENDPOINT,
  ORDERS_STATS_ENDPOINT,
  OrderInputSchema,
  type Order,
} from '@/features/orders';
import { AUTH_ENDPOINTS } from '@/shared/api';
import { ACTIONS, buildAbility, subject } from '@/shared/rbac';
import { db, mockSessions } from './data';

export const API = '/api';

let correlationSeq = 0;
const nextCorrelationId = () => `mock-${String(++correlationSeq).padStart(6, '0')}`;

/** Error body with the backend contract: `{ code, message, correlationId, fieldErrors? }`. */
export function apiError(
  status: number,
  code: string,
  message: string,
  fieldErrors?: Record<string, string[]>,
) {
  const correlationId = nextCorrelationId();
  return HttpResponse.json(
    { code, message, correlationId, ...(fieldErrors ? { fieldErrors } : {}) },
    { status, headers: { 'x-correlation-id': correlationId } },
  );
}

const ability = () => buildAbility(mockSessions[db.user].rules);

/** True if the body carries at least one field the current user may not write. */
function deniedFields(body: unknown, cannot: (field: string) => boolean): boolean {
  return typeof body === 'object' && body !== null && Object.keys(body).some(cannot);
}

const encodeCursor = (offset: number) => btoa(`o:${String(offset)}`);
const decodeCursor = (cursor: string | null) => {
  if (!cursor) return 0;
  const offset = Number(atob(cursor).slice(2));
  return Number.isInteger(offset) && offset >= 0 ? offset : 0;
};

function sortOrders(orders: Order[], sort: string | null): Order[] {
  const copy = [...orders];
  switch (sort) {
    case ORDER_SORT.createdAtAsc:
      return copy.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    case ORDER_SORT.totalDesc:
      return copy.sort((a, b) => b.total - a.total);
    default:
      return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

export const handlers = [
  // ---------------------------------------------------------------- auth (BFF)
  http.get(`${API}${AUTH_ENDPOINTS.me}`, () => HttpResponse.json(mockSessions[db.user])),
  http.post(`${API}${AUTH_ENDPOINTS.refresh}`, () => new HttpResponse(null, { status: 204 })),
  http.post(`${API}${AUTH_ENDPOINTS.logout}`, () => new HttpResponse(null, { status: 204 })),

  // ---------------------------------------------------------------- orders
  http.get(`${API}${ORDERS_STATS_ENDPOINT}`, async () => {
    await delay();
    const byMonth = new Map<string, { total: number; count: number }>();
    for (const o of db.orders) {
      const month = o.createdAt.slice(0, 7);
      const entry = byMonth.get(month) ?? { total: 0, count: 0 };
      byMonth.set(month, { total: entry.total + o.total, count: entry.count + 1 });
    }
    const months = [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, v]) => ({ month, ...v }));
    return HttpResponse.json({ months });
  }),

  http.get(`${API}${ORDERS_ENDPOINT}`, async ({ request }) => {
    await delay();
    const url = new URL(request.url);
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 20) || 20, 1), 100);
    const status = url.searchParams.get('status');
    const offset = decodeCursor(url.searchParams.get('cursor'));
    const filtered = sortOrders(db.orders, url.searchParams.get('sort')).filter(
      (o) => !status || o.status === status,
    );
    const items = filtered.slice(offset, offset + limit);
    const next = offset + limit < filtered.length ? encodeCursor(offset + limit) : null;
    return HttpResponse.json({ items, nextCursor: next, limit });
  }),

  http.get(`${API}${ORDERS_ENDPOINT}/:id`, async ({ params }) => {
    await delay();
    const order = db.orders.find((o) => o.id === params.id);
    return order ? HttpResponse.json(order) : apiError(404, 'NOT_FOUND', 'Order not found');
  }),

  http.post(`${API}${ORDERS_ENDPOINT}`, async ({ request }) => {
    await delay();
    if (ability().cannot(ACTIONS.create, ORDER_SUBJECT)) return apiError(403, 'FORBIDDEN', 'Not allowed');
    const body = await request.json();
    // Field-level check, as a real backend does (permittedFieldsOf): every field sent must be writable.
    if (deniedFields(body, (field) => ability().cannot(ACTIONS.create, ORDER_SUBJECT, field)))
      return apiError(403, 'FORBIDDEN', 'Not allowed');
    // The server owns the defaults of the fields the client may not send.
    const parsed = OrderInputSchema.safeParse({ status: DEFAULT_ORDER_STATUS, ...(body as object) });
    if (!parsed.success) {
      return apiError(422, 'VALIDATION_ERROR', 'Invalid order', z.flattenError(parsed.error).fieldErrors);
    }
    const order: Order = {
      ...parsed.data,
      id: crypto.randomUUID(),
      number: `ORD-${String(2000 + db.orders.length)}`,
      createdAt: new Date().toISOString(),
    };
    db.orders = [order, ...db.orders];
    return HttpResponse.json(order, { status: 201 });
  }),

  http.patch(`${API}${ORDERS_ENDPOINT}/:id`, async ({ params, request }) => {
    await delay();
    const current = db.orders.find((o) => o.id === params.id);
    if (!current) return apiError(404, 'NOT_FOUND', 'Order not found');
    const record = subject(ORDER_SUBJECT, { ...current });
    if (ability().cannot(ACTIONS.update, record)) return apiError(403, 'FORBIDDEN', 'Not allowed');
    const body = await request.json();
    if (deniedFields(body, (field) => ability().cannot(ACTIONS.update, record, field)))
      return apiError(403, 'FORBIDDEN', 'Not allowed');
    const parsed = OrderInputSchema.partial().safeParse(body);
    if (!parsed.success) return apiError(422, 'VALIDATION_ERROR', 'Invalid order');
    const updated: Order = { ...current, ...parsed.data };
    db.orders = db.orders.map((o) => (o.id === current.id ? updated : o));
    return HttpResponse.json(updated);
  }),

  http.delete(`${API}${ORDERS_ENDPOINT}/:id`, async ({ params }) => {
    await delay();
    const current = db.orders.find((o) => o.id === params.id);
    if (!current) return apiError(404, 'NOT_FOUND', 'Order not found');
    if (ability().cannot(ACTIONS.delete, subject(ORDER_SUBJECT, { ...current })))
      return apiError(403, 'FORBIDDEN', 'Not allowed');
    db.orders = db.orders.filter((o) => o.id !== current.id);
    return new HttpResponse(null, { status: 204 });
  }),
];
