import { http, type PageParams } from '@/shared/api';
import {
  OrderPageSchema,
  OrderSchema,
  OrderStatsSchema,
  type Order,
  type OrderInput,
  type OrderPage,
  type OrderStats,
  type OrderStatus,
} from '../model/orders.schema';

/** Endpoints of the feature: every response is validated with Zod (kyfes §4.2). */
export const ordersApi = {
  async list(
    params: PageParams & { status?: OrderStatus | undefined },
    signal?: AbortSignal,
  ): Promise<OrderPage> {
    const { data } = await http.get<unknown>('/orders', { params, signal });
    return OrderPageSchema.parse(data);
  },

  async get(id: string, signal?: AbortSignal): Promise<Order> {
    const { data } = await http.get<unknown>(`/orders/${encodeURIComponent(id)}`, { signal });
    return OrderSchema.parse(data);
  },

  /** Only the fields the user may write: the server applies the defaults of the others (e.g. status). */
  async create(input: Partial<OrderInput>): Promise<Order> {
    const { data } = await http.post<unknown>('/orders', input);
    return OrderSchema.parse(data);
  },

  async update(id: string, input: Partial<OrderInput>): Promise<Order> {
    const { data } = await http.patch<unknown>(`/orders/${encodeURIComponent(id)}`, input);
    return OrderSchema.parse(data);
  },

  async remove(id: string): Promise<void> {
    await http.delete(`/orders/${encodeURIComponent(id)}`);
  },

  async stats(signal?: AbortSignal): Promise<OrderStats> {
    const { data } = await http.get<unknown>('/orders/stats', { signal });
    return OrderStatsSchema.parse(data);
  },
};
