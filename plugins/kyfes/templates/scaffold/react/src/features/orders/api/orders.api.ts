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
import { ORDERS_ENDPOINT, ORDERS_STATS_ENDPOINT } from '../constants';

const orderEndpoint = (id: string) => `${ORDERS_ENDPOINT}/${encodeURIComponent(id)}`;

/** Endpoints of the feature: every response is validated with Zod (kyfes §4.2). */
export const ordersApi = {
  async list(
    params: PageParams & { status?: OrderStatus | undefined },
    signal?: AbortSignal,
  ): Promise<OrderPage> {
    const { data } = await http.get<unknown>(ORDERS_ENDPOINT, { params, signal });
    return OrderPageSchema.parse(data);
  },

  async get(id: string, signal?: AbortSignal): Promise<Order> {
    const { data } = await http.get<unknown>(orderEndpoint(id), { signal });
    return OrderSchema.parse(data);
  },

  /** Only the fields the user may write: the server applies the defaults of the others (e.g. status). */
  async create(input: Partial<OrderInput>): Promise<Order> {
    const { data } = await http.post<unknown>(ORDERS_ENDPOINT, input);
    return OrderSchema.parse(data);
  },

  async update(id: string, input: Partial<OrderInput>): Promise<Order> {
    const { data } = await http.patch<unknown>(orderEndpoint(id), input);
    return OrderSchema.parse(data);
  },

  async remove(id: string): Promise<void> {
    await http.delete(orderEndpoint(id));
  },

  async stats(signal?: AbortSignal): Promise<OrderStats> {
    const { data } = await http.get<unknown>(ORDERS_STATS_ENDPOINT, { signal });
    return OrderStatsSchema.parse(data);
  },
};
