import { SUBJECT } from '@/shared/config/constants'

/**
 * Constants of the orders feature: the only place where they are written (a leaf: it imports nothing from the
 * feature). New features follow the same pattern with their own `features/<f>/constants.ts`.
 */

/** Name of the feature: the single source of its i18n namespace, route segment, route name and query-key root. */
export const ORDERS_FEATURE = 'orders' as const
/** i18n namespace of the feature, loaded lazily (registered in app/). */
export const ORDERS_NAMESPACE = ORDERS_FEATURE

/** CASL subject of the feature (registered in SUBJECT of shared/config/constants.ts). */
export const ORDER_SUBJECT = SUBJECT.Order

/** Fields of the order form, checked one by one against the field-level rules. */
export const ORDER_FIELD = { customerName: 'customerName', status: 'status', total: 'total' } as const
export type OrderField = (typeof ORDER_FIELD)[keyof typeof ORDER_FIELD]
export const ORDER_FIELDS: readonly OrderField[] = Object.values(ORDER_FIELD)

export const ORDER_STATUS = {
  draft: 'draft',
  confirmed: 'confirmed',
  shipped: 'shipped',
  cancelled: 'cancelled',
} as const
/** Status of a new order. */
export const DEFAULT_ORDER_STATUS = ORDER_STATUS.draft

/** List sort (`-` = descending), as sent to the API. */
export const ORDER_SORT = { createdAtAsc: 'createdAt', createdAtDesc: '-createdAt' } as const
export type OrderSort = (typeof ORDER_SORT)[keyof typeof ORDER_SORT]
export const DEFAULT_ORDER_SORT: OrderSort = ORDER_SORT.createdAtDesc

/** API endpoints (relative to API_BASE_URL). */
export const ORDERS_ENDPOINT = '/orders'
export const ORDERS_STATS_ENDPOINT = '/orders/stats'

/** Route names (links from pages, definitions in app/router). */
export const ORDER_ROUTE = {
  list: ORDERS_FEATURE,
  create: 'order-new',
  detail: 'order-detail',
  edit: 'order-edit',
} as const
/** Route paths (children of the root layout); `:id` becomes the `id` prop of the page. */
export const ORDER_ROUTE_PATH = {
  list: ORDERS_FEATURE,
  create: 'orders/new',
  detail: 'orders/:id',
  edit: 'orders/:id/edit',
} as const
