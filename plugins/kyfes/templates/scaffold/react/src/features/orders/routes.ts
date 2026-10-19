import { ORDERS_FEATURE } from './model/orders.feature';

/** Route param holding the order id (`useParams()` → `orderId`). */
const ORDER_ID_PARAM = 'orderId';

/** Relative paths for the router (app): the section and its children. */
export const orderRoutes = {
  section: ORDERS_FEATURE,
  new: 'new',
  detail: `:${ORDER_ID_PARAM}`,
  edit: `:${ORDER_ID_PARAM}/edit`,
} as const;

const SECTION_PATH = `/${orderRoutes.section}`;

/** Paths of the feature, shared by the router (app) and the links of the components. */
export const orderPaths = {
  list: SECTION_PATH,
  new: `${SECTION_PATH}/${orderRoutes.new}`,
  detail: (id: string) => `${SECTION_PATH}/${encodeURIComponent(id)}`,
  edit: (id: string) => `${SECTION_PATH}/${encodeURIComponent(id)}/edit`,
} as const;
