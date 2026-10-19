import { SUBJECT } from '@/shared/config/constants';

/**
 * Domain constants of the orders feature, written once (kyfes `constants-location`). Leaf module:
 * it imports nothing from the feature, the rest of the feature imports from here.
 */

/**
 * Name of the feature = its folder: i18n namespace (`locales/<lng>.json`, loaded lazily by
 * shared/i18n), root of its query keys and of its UI section.
 */
export const ORDERS_FEATURE = 'orders';

/** i18n namespace of the feature: `useTranslation(ORDERS_NS)`. */
export const ORDERS_NS = ORDERS_FEATURE;

/** CASL subject of the feature (kyfes §5). */
export const ORDER_SUBJECT = SUBJECT.Order;

/** Fields of Order named by the field-level rules (`can(action, subject, field)`, `fields`). */
export const ORDER_FIELDS = {
  customerName: 'customerName',
  status: 'status',
  total: 'total',
} as const;

export const ORDER_STATUS = {
  draft: 'draft',
  confirmed: 'confirmed',
  shipped: 'shipped',
  cancelled: 'cancelled',
} as const;
export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

/** Status of a new order when the client does not send one (applied by the server). */
export const DEFAULT_ORDER_STATUS: OrderStatus = ORDER_STATUS.draft;

/** Sort orders accepted by the list endpoint (`field:direction`). */
export const ORDER_SORT = {
  createdAtDesc: 'createdAt:desc',
  createdAtAsc: 'createdAt:asc',
  totalDesc: 'total:desc',
} as const;
export type OrderSort = (typeof ORDER_SORT)[keyof typeof ORDER_SORT];
export const DEFAULT_ORDER_SORT: OrderSort = ORDER_SORT.createdAtDesc;

/** REST resource of the orders (relative to the API base URL). */
export const ORDERS_ENDPOINT = '/orders';
/** Monthly totals of the orders (aggregated by the backend). */
export const ORDERS_STATS_ENDPOINT = `${ORDERS_ENDPOINT}/stats`;

/** Route param holding the order id (`useParams()` → `orderId`). */
export const ORDER_ID_PARAM = 'orderId';

/** Modes of `<OrderDetail>`: read-only view or edit form. */
export const ORDER_DETAIL_MODE = {
  view: 'view',
  edit: 'edit',
} as const;
export type OrderDetailMode = (typeof ORDER_DETAIL_MODE)[keyof typeof ORDER_DETAIL_MODE];

/** Static segments of the feature routes (`/orders/new`, `/orders/:orderId/edit` = edit mode of the detail). */
export const ORDER_ROUTE_SEGMENT = {
  new: 'new',
  edit: ORDER_DETAIL_MODE.edit,
} as const;
