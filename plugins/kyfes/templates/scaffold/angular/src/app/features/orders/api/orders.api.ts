import { Injectable, inject } from '@angular/core';
import { ApiClient, type PageParams, pageSchema } from '@shared/api';
import {
  type Order,
  type OrderInput,
  type OrderStatus,
  OrderSchema,
  OrderStatsSchema,
} from '../model/orders.schema';

const OrderPageSchema = pageSchema(OrderSchema);

export interface OrderListParams extends PageParams {
  status?: OrderStatus;
}

/** Endpoint della feature: ogni risposta è validata con Zod (tipi da z.infer). */
@Injectable({ providedIn: 'root' })
export class OrdersApi {
  private readonly api = inject(ApiClient);

  list(params: OrderListParams) {
    return this.api.get('/orders', OrderPageSchema, { ...params });
  }

  get(id: string) {
    return this.api.get(`/orders/${encodeURIComponent(id)}`, OrderSchema);
  }

  create(input: OrderInput): Promise<Order> {
    return this.api.post('/orders', input, OrderSchema);
  }

  update(id: string, input: OrderInput): Promise<Order> {
    return this.api.put(`/orders/${encodeURIComponent(id)}`, input, OrderSchema);
  }

  remove(id: string): Promise<void> {
    return this.api.delete(`/orders/${encodeURIComponent(id)}`);
  }

  stats() {
    return this.api.get('/orders/stats', OrderStatsSchema);
  }
}
