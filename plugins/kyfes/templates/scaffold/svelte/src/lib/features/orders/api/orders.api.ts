import { http, pageSchema, toPageQuery, type PageParams } from '$lib/shared/api';
import { ORDER_STATS_ENDPOINT, ORDERS_ENDPOINT } from '../constants';
import {
	OrderPayloadSchema,
	OrderSchema,
	OrderStatsSchema,
	type Order,
	type OrderPayload,
	type OrderStats
} from '../model/orders.schema';

const orderEndpoint = (id: string) => `${ORDERS_ENDPOINT}/${encodeURIComponent(id)}`;

export const OrderPageSchema = pageSchema(OrderSchema);
export type OrderPage = { items: Order[]; nextCursor: string | null; limit: number };

/**
 * Endpoints of the orders feature: every response is validated with Zod. Reads accept the
 * AbortSignal of TanStack Query, so `cancelQueries` really aborts the request.
 */
export const ordersApi = {
	async list(params: PageParams, signal?: AbortSignal): Promise<OrderPage> {
		const { data } = await http.get<unknown>(ORDERS_ENDPOINT, {
			params: toPageQuery(params),
			signal
		});
		return OrderPageSchema.parse(data);
	},

	async get(id: string, signal?: AbortSignal): Promise<Order> {
		const { data } = await http.get<unknown>(orderEndpoint(id), { signal });
		return OrderSchema.parse(data);
	},

	/** Only the writable fields: a field the user may not set is omitted (server default). */
	async create(payload: OrderPayload): Promise<Order> {
		const { data } = await http.post<unknown>(ORDERS_ENDPOINT, OrderPayloadSchema.parse(payload));
		return OrderSchema.parse(data);
	},

	/** Partial update (PATCH): only the fields the user may write on this record. */
	async update(id: string, payload: OrderPayload): Promise<Order> {
		const { data } = await http.patch<unknown>(
			orderEndpoint(id),
			OrderPayloadSchema.parse(payload)
		);
		return OrderSchema.parse(data);
	},

	async remove(id: string): Promise<void> {
		await http.delete(orderEndpoint(id));
	},

	async stats(signal?: AbortSignal): Promise<OrderStats> {
		const { data } = await http.get<unknown>(ORDER_STATS_ENDPOINT, { signal });
		return OrderStatsSchema.parse(data);
	}
};
