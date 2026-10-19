import { Injectable, inject } from '@angular/core';
import { ApiClient, type PageParams, type RequestOptions, pageSchema } from '@shared/api';
import {
  type Order,
  type OrderPatch,
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

  list(params: OrderListParams, options?: RequestOptions) {
    return this.api.get('/orders', OrderPageSchema, { ...params }, options);
  }

  get(id: string, options?: RequestOptions) {
    return this.api.get(`/orders/${encodeURIComponent(id)}`, OrderSchema, undefined, options);
  }

  /** Solo i campi che l'utente può scrivere (`status` omesso → `draft`); il server valida il resto. */
  create(input: OrderPatch): Promise<Order> {
    return this.api.post('/orders', input, OrderSchema);
  }

  /** Aggiornamento parziale (PATCH): si inviano solo i campi scrivibili dall'utente. */
  update(id: string, input: OrderPatch): Promise<Order> {
    return this.api.patch(`/orders/${encodeURIComponent(id)}`, input, OrderSchema);
  }

  remove(id: string): Promise<void> {
    return this.api.delete(`/orders/${encodeURIComponent(id)}`);
  }

  stats(options?: RequestOptions) {
    return this.api.get('/orders/stats', OrderStatsSchema, undefined, options);
  }
}
