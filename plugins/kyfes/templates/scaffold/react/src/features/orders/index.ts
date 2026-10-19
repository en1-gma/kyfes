// Public API of the orders feature: pages and app import only from here.
export { OrdersTable } from './components/OrdersTable';
export { OrderForm } from './components/OrderForm';
export { OrderDetail } from './components/OrderDetail';
export { OrdersChart } from './components/OrdersChart';
export {
  orderKeys,
  orderQueryOptions,
  ordersInfiniteQueryOptions,
  orderStatsQueryOptions,
} from './api/orders.queries';
export { useCreateOrder, useUpdateOrder, useDeleteOrder } from './api/orders.mutations';
export { OrderSchema, OrderInputSchema, ORDER_STATUSES } from './model/orders.schema';
export type { Order, OrderInput } from './model/orders.schema';
export {
  ORDERS_NS,
  ORDER_SUBJECT,
  ORDER_FIELDS,
  ORDER_STATUS,
  DEFAULT_ORDER_STATUS,
  ORDER_SORT,
  DEFAULT_ORDER_SORT,
  ORDERS_ENDPOINT,
  ORDERS_STATS_ENDPOINT,
  ORDER_DETAIL_MODE,
} from './constants';
export type { OrderStatus, OrderSort } from './constants';
export { orderSubject } from './permissions';
export { orderPaths, orderRoutes } from './routes';
