import { deleteRequest, getParsed, pageSchema, sendParsed, toPageQuery, type PageParams } from '@/shared/api'
import {
  OrderSchema,
  OrderStatsSchema,
  type Order,
  type OrderFilters,
  type OrderInput,
  type OrderStats,
} from '../model/orders.schema'

export const OrderPageSchema = pageSchema(OrderSchema)

const BASE = '/orders'

export const ordersApi = {
  list(params: PageParams & OrderFilters, signal?: AbortSignal) {
    const query = { ...toPageQuery(params), ...(params.status ? { status: params.status } : {}) }
    return getParsed(BASE, OrderPageSchema, { params: query, signal })
  },
  get(id: string, signal?: AbortSignal): Promise<Order> {
    return getParsed(`${BASE}/${encodeURIComponent(id)}`, OrderSchema, { signal })
  },
  /** Only the fields the user may write (field-level permissions): the server fills the rest. */
  create(input: Partial<OrderInput>): Promise<Order> {
    return sendParsed('post', BASE, input, OrderSchema)
  },
  update(id: string, input: Partial<OrderInput>): Promise<Order> {
    return sendParsed('patch', `${BASE}/${encodeURIComponent(id)}`, input, OrderSchema)
  },
  remove(id: string): Promise<void> {
    return deleteRequest(`${BASE}/${encodeURIComponent(id)}`)
  },
  stats(signal?: AbortSignal): Promise<OrderStats> {
    return getParsed(`${BASE}/stats`, OrderStatsSchema, { signal })
  },
}
