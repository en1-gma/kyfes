import { http, toPageQuery, type PageParams } from '@/shared/api';
import {
  OrderPageSchema,
  OrderSchema,
  OrderStatsSchema,
  type Order,
  type OrderListFilters,
  type OrderPage,
  type OrderStats,
  type OrderWrite,
} from '../model/orders.schema';

const BASE = '/orders';

/** Endpoints of the orders feature: every response is parsed with Zod. */
export const ordersApi = {
  async list(
    params: PageParams & Pick<OrderListFilters, 'status'>,
    signal?: AbortSignal,
  ): Promise<OrderPage> {
    const query = { ...toPageQuery(params), ...(params.status ? { status: params.status } : {}) };
    const { data } = await http.get(BASE, { params: query, signal });
    return OrderPageSchema.parse(data);
  },

  async get(id: string, signal?: AbortSignal): Promise<Order> {
    const { data } = await http.get(`${BASE}/${encodeURIComponent(id)}`, { signal });
    return OrderSchema.parse(data);
  },

  async create(input: OrderWrite): Promise<Order> {
    const { data } = await http.post(BASE, input);
    return OrderSchema.parse(data);
  },

  async update(id: string, input: OrderWrite): Promise<Order> {
    const { data } = await http.patch(`${BASE}/${encodeURIComponent(id)}`, input);
    return OrderSchema.parse(data);
  },

  async remove(id: string): Promise<void> {
    await http.delete(`${BASE}/${encodeURIComponent(id)}`);
  },

  async stats(signal?: AbortSignal): Promise<OrderStats> {
    const { data } = await http.get(`${BASE}/stats`, { signal });
    return OrderStatsSchema.parse(data);
  },
};
