import type { NamespaceLoaders } from '@/shared/i18n'

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
export {
  ORDER_STATUSES,
  OrderSchema,
  OrderInputSchema,
  type Order,
  type OrderInput,
  type OrderStatus,
} from './model/orders.schema'
export { orderSubject } from './permissions'
export {
  DEFAULT_ORDER_SORT,
  DEFAULT_ORDER_STATUS,
  ORDER_FIELD,
  ORDER_ROUTE,
  ORDER_ROUTE_PATH,
  ORDER_SORT,
  ORDER_STATUS,
  ORDER_SUBJECT,
  ORDERS_ENDPOINT,
  ORDERS_FEATURE,
  ORDERS_NAMESPACE,
  ORDERS_STATS_ENDPOINT,
  type OrderField,
  type OrderSort,
} from './constants'

export const ordersLocales: NamespaceLoaders = {
  it: () => import('./locales/it.json'),
  en: () => import('./locales/en.json'),
}
