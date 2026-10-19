import { http, pageSchema, toPageQuery, type PageParams } from '$lib/shared/api';
import {
	OrderInputSchema,
	OrderSchema,
	OrderStatsSchema,
	type Order,
	type OrderInput,
	type OrderStats
} from '../model/orders.schema';

export const OrderPageSchema = pageSchema(OrderSchema);
export type OrderPage = { items: Order[]; nextCursor: string | null; limit: number };

/** Endpoints of the orders feature: every response is validated with Zod. */
export const ordersApi = {
	async list(params: PageParams): Promise<OrderPage> {
		const { data } = await http.get<unknown>('/orders', { params: toPageQuery(params) });
		return OrderPageSchema.parse(data);
	},

	async get(id: string): Promise<Order> {
		const { data } = await http.get<unknown>(`/orders/${encodeURIComponent(id)}`);
		return OrderSchema.parse(data);
	},

	async create(input: OrderInput): Promise<Order> {
		const { data } = await http.post<unknown>('/orders', OrderInputSchema.parse(input));
		return OrderSchema.parse(data);
	},

	async update(id: string, input: OrderInput): Promise<Order> {
		const { data } = await http.put<unknown>(
			`/orders/${encodeURIComponent(id)}`,
			OrderInputSchema.parse(input)
		);
		return OrderSchema.parse(data);
	},

	async remove(id: string): Promise<void> {
		await http.delete(`/orders/${encodeURIComponent(id)}`);
	},

	async stats(): Promise<OrderStats> {
		const { data } = await http.get<unknown>('/orders/stats');
		return OrderStatsSchema.parse(data);
	}
};
