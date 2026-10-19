import type { NamespaceLoaders } from '@/shared/i18n'
import { ORDERS_FEATURE } from './model/orders.feature'

// Public API of the orders feature: pages and app import only from here.
export { default as OrdersTable } from './components/OrdersTable.vue'
export { default as OrderForm } from './components/OrderForm.vue'
export { default as OrderDetail } from './components/OrderDetail.vue'
export { default as OrdersChart } from './components/OrdersChart.vue'
export {
  orderKeys,
  orderQueryOptions,
  ordersInfiniteQueryOptions,
  orderStatsQueryOptions,
  useOrder,
} from './api/orders.queries'
export { useCreateOrder, useUpdateOrder, useDeleteOrder } from './api/orders.mutations'
export { ORDERS_ENDPOINT } from './api/orders.api'
export {
  DEFAULT_ORDER_SORT,
  DEFAULT_ORDER_STATUS,
  ORDER_SORT,
  ORDER_STATUS,
  ORDER_STATUSES,
  OrderSchema,
  OrderInputSchema,
  type Order,
  type OrderInput,
  type OrderSort,
  type OrderStatus,
} from './model/orders.schema'
export { ORDERS_FEATURE } from './model/orders.feature'
export { ORDER_FIELD, ORDER_SUBJECT, orderSubject, type OrderField } from './permissions'

/** i18n namespace of the feature, loaded lazily (registered in app/). */
export const ORDERS_NAMESPACE = ORDERS_FEATURE
export const ordersLocales: NamespaceLoaders = {
  it: () => import('./locales/it.json'),
  en: () => import('./locales/en.json'),
}
