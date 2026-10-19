import { ORDER_ROUTE_SEGMENT, ORDERS_ROOT } from './constants';

/** UI paths of the orders feature (the folders under src/app/orders): never written elsewhere. */
export const orderPaths = {
  list: ORDERS_ROOT,
  new: `${ORDERS_ROOT}/${ORDER_ROUTE_SEGMENT.new}`,
  detail: (id: string) => `${ORDERS_ROOT}/${encodeURIComponent(id)}`,
  edit: (id: string) => `${ORDERS_ROOT}/${encodeURIComponent(id)}/${ORDER_ROUTE_SEGMENT.edit}`,
} as const;
