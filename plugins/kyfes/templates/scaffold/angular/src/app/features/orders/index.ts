import { provideI18nNamespace } from '@shared/i18n';
import { ORDERS_LOCALE_LOADERS, ORDERS_NS } from './locales';

/** API pubblica della feature `orders`: unico punto importabile da pages/app. */
export { OrderDetailComponent } from './components/order-detail/order-detail.component';
export { OrderFormComponent } from './components/order-form/order-form.component';
export { OrdersChartComponent } from './components/orders-chart/orders-chart.component';
export { OrdersTableComponent } from './components/orders-table/orders-table.component';
export { injectCreateOrder, injectDeleteOrder, injectUpdateOrder } from './api/orders.mutations';
export {
  injectOrder,
  injectOrderStats,
  injectOrdersList,
  orderKeys,
  orderQueryOptions,
  orderStatsQueryOptions,
  ordersInfiniteQueryOptions,
} from './api/orders.queries';
export { ORDERS_ENDPOINT, OrdersApi } from './api/orders.api';
export * from './model/orders.constants';
export * from './model/orders.schema';
export { ORDERS_NS } from './locales';
export {
  ORDER_FIELDS,
  ORDER_INPUT_FIELDS,
  ORDER_SUBJECT,
  orderSubject,
  type OrderInputField,
} from './permissions';
export { ORDER_ROUTE_PATHS, orderPaths } from './routes';

/** Namespace i18n `orders` caricato in lazy: da mettere nei `providers` della rotta. */
export function provideOrdersI18n() {
  return provideI18nNamespace(ORDERS_NS, ORDERS_LOCALE_LOADERS);
}
