import type { Locale, NamespaceLoader } from '@/shared/i18n';

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
  ORDER_STATUSES,
  ORDER_FIELDS,
  type Order,
  type OrderField,
  type OrderInput,
  type OrderWrite,
  type OrderStatus,
} from './model/orders.schema';

const loaders: Record<Locale, () => Promise<{ default: Record<string, unknown> }>> = {
  it: () => import('./locales/it.json'),
  en: () => import('./locales/en.json'),
};

/** `orders` namespace, loaded lazily per route (see shared/i18n I18nNamespaces). */
export const ordersMessages: NamespaceLoader = {
  namespace: 'orders',
  load: async (locale) => (await loaders[locale]()).default,
};
