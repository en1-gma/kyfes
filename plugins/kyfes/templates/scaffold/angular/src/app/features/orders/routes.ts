import { ORDERS_FEATURE, ORDER_EDIT_SEGMENT, ORDER_NEW_SEGMENT } from './constants';

export { ORDER_ROUTE_PATHS } from './constants';

const ROOT = `/${ORDERS_FEATURE}`;

/** Percorsi UI della feature (link e navigazioni): mai URL scritti a mano altrove. */
export const orderPaths = {
  list: ROOT,
  new: `${ROOT}/${ORDER_NEW_SEGMENT}`,
  detail: (id: string) => [ROOT, id],
  edit: (id: string) => [ROOT, id, ORDER_EDIT_SEGMENT],
};
