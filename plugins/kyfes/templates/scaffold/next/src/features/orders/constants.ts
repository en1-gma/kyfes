// Domain constants of the orders feature: the only place their values are written.
// Leaf module: imports nothing from the feature (only shared/config/constants).
import { SUBJECT } from '@/shared/config/constants';

/** CASL subject of the orders feature (registered in shared/config/constants SUBJECT). */
export const ORDER_SUBJECT = SUBJECT.Order;

/** i18n namespace of the orders feature: `useTranslations(ORDERS_NS)`. */
export const ORDERS_NS = 'orders';

/** REST resource of the orders feature (relative to API_BASE_URL); also the root of its query keys. */
export const ORDERS_ENDPOINT = '/orders';
/** Sub-resources of ORDERS_ENDPOINT. */
export const ORDERS_ENDPOINT_SEGMENT = {
  stats: 'stats',
} as const;

/** Scopes of the orders query keys (`[ORDERS_ENDPOINT, scope, …]`). */
export const ORDER_QUERY_SCOPE = {
  list: 'list',
  detail: 'detail',
  stats: ORDERS_ENDPOINT_SEGMENT.stats,
  remove: 'remove',
} as const;

/** Root of the UI routes of the feature (the folders under src/app/orders). */
export const ORDERS_ROOT = '/orders';
/** Static route segments under ORDERS_ROOT. */
export const ORDER_ROUTE_SEGMENT = {
  new: 'new',
  edit: 'edit',
} as const;

export const ORDER_STATUS = {
  draft: 'draft',
  confirmed: 'confirmed',
  shipped: 'shipped',
  cancelled: 'cancelled',
} as const;
export const ORDER_STATUSES = [
  ORDER_STATUS.draft,
  ORDER_STATUS.confirmed,
  ORDER_STATUS.shipped,
  ORDER_STATUS.cancelled,
] as const;
/** Status of a new order when the user cannot choose it (the server applies the same default). */
export const DEFAULT_ORDER_STATUS = ORDER_STATUS.draft;

/** Writable fields (CASL field permissions, form fields, server fieldErrors keys). */
export const ORDER_FIELD = {
  customerName: 'customerName',
  status: 'status',
  total: 'total',
} as const;
export const ORDER_FIELDS = [
  ORDER_FIELD.customerName,
  ORDER_FIELD.status,
  ORDER_FIELD.total,
] as const;

/** Validation messages: i18n keys of the `orders` namespace. */
export const ORDER_VALIDATION = {
  customerRequired: 'validation.customerRequired',
  tooLong: 'validation.tooLong',
  totalInvalid: 'validation.totalInvalid',
} as const;
