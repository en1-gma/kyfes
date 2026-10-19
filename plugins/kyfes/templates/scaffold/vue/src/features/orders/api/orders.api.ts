import { deleteRequest, getParsed, pageSchema, sendParsed, toPageQuery, type PageParams } from '@/shared/api'
import {
  OrderSchema,
  OrderStatsSchema,
  type Order,
  type OrderFilters,
  type OrderInput,
  type OrderStats,
} from '../model/orders.schema'
import { ORDERS_ENDPOINT, ORDERS_STATS_ENDPOINT } from '../constants'

export const OrderPageSchema = pageSchema(OrderSchema)

export const ordersApi = {
  list(params: PageParams & OrderFilters, signal?: AbortSignal) {
    const query = { ...toPageQuery(params), ...(params.status ? { status: params.status } : {}) }
    return getParsed(ORDERS_ENDPOINT, OrderPageSchema, { params: query, signal })
  },
  get(id: string, signal?: AbortSignal): Promise<Order> {
    return getParsed(`${ORDERS_ENDPOINT}/${encodeURIComponent(id)}`, OrderSchema, { signal })
  },
  /** Only the fields the user may write (field-level permissions): the server fills the rest. */
  create(input: Partial<OrderInput>): Promise<Order> {
    return sendParsed('post', ORDERS_ENDPOINT, input, OrderSchema)
  },
  update(id: string, input: Partial<OrderInput>): Promise<Order> {
    return sendParsed('patch', `${ORDERS_ENDPOINT}/${encodeURIComponent(id)}`, input, OrderSchema)
  },
  remove(id: string): Promise<void> {
    return deleteRequest(`${ORDERS_ENDPOINT}/${encodeURIComponent(id)}`)
  },
  stats(signal?: AbortSignal): Promise<OrderStats> {
    return getParsed(ORDERS_STATS_ENDPOINT, OrderStatsSchema, { signal })
  },
}
