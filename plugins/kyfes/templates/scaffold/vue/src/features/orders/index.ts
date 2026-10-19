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
  OrderSchema,
  OrderInputSchema,
  type Order,
  type OrderInput,
  type OrderStatus,
} from './model/orders.schema'
export { ORDER_SUBJECT, orderSubject } from './permissions'

/** i18n namespace of the feature, loaded lazily (registered in app/). */
export const ORDERS_NAMESPACE = 'orders'
export const ordersLocales: NamespaceLoaders = {
  it: () => import('./locales/it.json'),
  en: () => import('./locales/en.json'),
}
