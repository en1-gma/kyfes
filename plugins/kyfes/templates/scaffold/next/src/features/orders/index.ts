// Public API of the orders feature: the only entry point for pages/app.
export { OrdersTable } from './components/OrdersTable';
export { OrderForm, type OrderFormProps } from './components/OrderForm';
export { OrderDetail } from './components/OrderDetail';
export { OrdersChart } from './components/OrdersChart';
export { NewOrder, EditOrder } from './components/OrderEditor';
export {
  orderKeys,
  ordersInfiniteQueryOptions,
  orderQueryOptions,
  orderStatsQueryOptions,
  useOrdersInfinite,
  useOrder,
  useOrderStats,
} from './api/orders.queries';
export { ORDERS_ENDPOINT } from './api/orders.api';
export { useCreateOrder, useUpdateOrder, useDeleteOrder } from './api/orders.mutations';
export {
  ORDER_SUBJECT,
  orderSubject,
  canEditOrder,
  canDeleteOrder,
  canEditOrderStatus,
  writableOrderFields,
  pickWritable,
} from './permissions';
export {
  OrderSchema,
  OrderInputSchema,
  ORDER_STATUS,
  ORDER_STATUSES,
  DEFAULT_ORDER_STATUS,
  ORDER_FIELD,
  ORDER_FIELDS,
  type Order,
  type OrderField,
  type OrderInput,
  type OrderWrite,
  type OrderStatus,
} from './model/orders.schema';

export { orderPaths } from './routes';
export { ORDERS_NS, ordersMessages } from './locales/namespace';
