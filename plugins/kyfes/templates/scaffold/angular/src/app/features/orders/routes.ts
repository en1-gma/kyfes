import { ORDERS_FEATURE } from './model/orders.constants';

const ID_PARAM = ':id';
const NEW_SEGMENT = 'new';
const EDIT_SEGMENT = 'edit';

/** Percorsi (relativi) delle rotte della feature, da usare in app.routes.ts. */
export const ORDER_ROUTE_PATHS = {
  root: ORDERS_FEATURE,
  list: '',
  new: NEW_SEGMENT,
  detail: ID_PARAM,
  edit: `${ID_PARAM}/${EDIT_SEGMENT}`,
} as const;

const ROOT = `/${ORDERS_FEATURE}`;

/** Percorsi UI della feature (link e navigazioni): mai URL scritti a mano altrove. */
export const orderPaths = {
  list: ROOT,
  new: `${ROOT}/${NEW_SEGMENT}`,
  detail: (id: string) => [ROOT, id],
  edit: (id: string) => [ROOT, id, EDIT_SEGMENT],
};
