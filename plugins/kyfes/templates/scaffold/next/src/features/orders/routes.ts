const ORDERS_ROOT = '/orders';

/** UI paths of the orders feature (the folders under src/app/orders): never written elsewhere. */
export const orderPaths = {
  list: ORDERS_ROOT,
  new: `${ORDERS_ROOT}/new`,
  detail: (id: string) => `${ORDERS_ROOT}/${encodeURIComponent(id)}`,
  edit: (id: string) => `${ORDERS_ROOT}/${encodeURIComponent(id)}/edit`,
} as const;
