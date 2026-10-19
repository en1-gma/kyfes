import { http, HttpResponse, type HttpHandler } from 'msw';
import { z } from 'zod';
import { OrderInputSchema, type Order } from '$lib/features/orders';
import { buildAbility, subject } from '$lib/shared/rbac';
import { seedOrders, SESSIONS, type MockUser } from './data';

/** In-memory backend for dev (browser) and tests (node). */
const db = { orders: seedOrders(), user: 'manager' as MockUser | null };

export function resetMockDb(): void {
	db.orders = seedOrders();
	db.user = 'manager';
}

/** Selects the logged-in mock user; `null` = not authenticated (401). */
export function useMockUser(user: MockUser | null): void {
	db.user = user;
}

let correlation = 0;
function apiError(
	status: number,
	code: string,
	message: string,
	fieldErrors?: Record<string, string[]>
) {
	correlation += 1;
	return HttpResponse.json(
		{
			code,
			message,
			correlationId: `mock-${String(correlation).padStart(6, '0')}`,
			...(fieldErrors ? { fieldErrors } : {})
		},
		{ status }
	);
}

/** Same rules as the session: the mock backend enforces conditions and fields like a real one. */
const ability = () => buildAbility(db.user ? SESSIONS[db.user].rules : []);

/** Request body: every field optional (POST and PATCH carry only the writable fields). */
const OrderBodySchema = OrderInputSchema.partial().strict();
type OrderBody = z.infer<typeof OrderBodySchema>;

function invalidBody(error: z.ZodError) {
	return apiError(422, 'VALIDATION_ERROR', 'Invalid order', z.flattenError(error).fieldErrors);
}

/** A field sent by the client that the user may not write on `target`. */
function forbiddenField(
	action: 'create' | 'update',
	target: Order | 'Order',
	body: OrderBody
): boolean {
	const current = ability();
	const subjectOf = target === 'Order' ? target : subject('Order', { ...target });
	return Object.keys(body).some((field) => current.cannot(action, subjectOf, field));
}

export const handlers: HttpHandler[] = [
	http.get('/api/auth/me', () =>
		db.user
			? HttpResponse.json(SESSIONS[db.user])
			: apiError(401, 'UNAUTHENTICATED', 'Login required')
	),
	http.post('/api/auth/refresh', () =>
		db.user
			? new HttpResponse(null, { status: 204 })
			: apiError(401, 'UNAUTHENTICATED', 'Login required')
	),
	http.post('/api/auth/logout', () => {
		db.user = null;
		return new HttpResponse(null, { status: 204 });
	}),
	http.get('/api/orders/stats', () => {
		const totals = new Map<string, { total: number; count: number }>();
		for (const order of db.orders) {
			const month = order.createdAt.slice(0, 7);
			const entry = totals.get(month) ?? { total: 0, count: 0 };
			totals.set(month, { total: entry.total + order.total, count: entry.count + 1 });
		}
		const months = [...totals.entries()]
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([month, value]) => ({
				month,
				total: Math.round(value.total * 100) / 100,
				count: value.count
			}));
		return HttpResponse.json({ months });
	}),
	http.get('/api/orders', ({ request }) => {
		const url = new URL(request.url);
		const limit = Math.min(Number(url.searchParams.get('limit') ?? 20) || 20, 100);
		const cursor = url.searchParams.get('cursor');
		const sorted = [...db.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
		const start = cursor ? Number(cursor) : 0;
		const items = sorted.slice(start, start + limit);
		const next = start + limit < sorted.length ? String(start + limit) : null;
		return HttpResponse.json({ items, nextCursor: next, limit });
	}),
	http.get('/api/orders/:id', ({ params }) => {
		const order = db.orders.find((o) => o.id === params.id);
		return order ? HttpResponse.json(order) : apiError(404, 'NOT_FOUND', 'Order not found');
	}),
	http.post('/api/orders', async ({ request }) => {
		if (ability().cannot('create', 'Order')) return apiError(403, 'FORBIDDEN', 'Not allowed');
		const parsed = OrderBodySchema.required({ customerName: true, total: true }).safeParse(
			await request.json()
		);
		if (!parsed.success) return invalidBody(parsed.error);
		if (forbiddenField('create', 'Order', parsed.data)) {
			return apiError(403, 'FORBIDDEN', 'Field not allowed');
		}
		const n = db.orders.length + 1;
		const order: Order = {
			status: 'draft',
			...parsed.data,
			id: crypto.randomUUID(),
			number: `ORD-${String(n).padStart(4, '0')}`,
			createdAt: new Date().toISOString()
		};
		db.orders.push(order);
		return HttpResponse.json(order, { status: 201 });
	}),
	http.patch('/api/orders/:id', async ({ params, request }) => {
		const index = db.orders.findIndex((o) => o.id === params.id);
		const current = db.orders[index];
		if (!current) return apiError(404, 'NOT_FOUND', 'Order not found');
		if (ability().cannot('update', subject('Order', { ...current }))) {
			return apiError(403, 'FORBIDDEN', 'Not allowed');
		}
		const parsed = OrderBodySchema.safeParse(await request.json());
		if (!parsed.success) return invalidBody(parsed.error);
		if (forbiddenField('update', current, parsed.data)) {
			return apiError(403, 'FORBIDDEN', 'Field not allowed');
		}
		const updated: Order = { ...current, ...parsed.data };
		db.orders[index] = updated;
		return HttpResponse.json(updated);
	}),
	http.delete('/api/orders/:id', ({ params }) => {
		const current = db.orders.find((o) => o.id === params.id);
		if (!current) return apiError(404, 'NOT_FOUND', 'Order not found');
		if (ability().cannot('delete', subject('Order', { ...current }))) {
			return apiError(403, 'FORBIDDEN', 'Not allowed');
		}
		db.orders = db.orders.filter((o) => o.id !== current.id);
		return new HttpResponse(null, { status: 204 });
	})
];

/** Overrides for error-state tests. */
export const errorHandlers = {
	ordersServerError: http.get('/api/orders', () => apiError(500, 'INTERNAL', 'Boom')),
	ordersForbidden: http.get('/api/orders', () => apiError(403, 'FORBIDDEN', 'Not allowed')),
	deleteServerError: http.delete('/api/orders/:id', () => apiError(500, 'INTERNAL', 'Boom'))
};
