import { Subject } from '$lib/shared/config/constants';

/**
 * Constants of the orders feature: the only place they are defined. A leaf module: it imports
 * nothing from the feature (only shared/config/constants.ts).
 */

/** Name of the feature: root of its query keys. */
export const ORDERS_FEATURE = 'orders';

/** CASL subject of the feature (the name is registered in shared/config/constants.ts). */
export const ORDER_SUBJECT = Subject.Order;

/** Writable fields of an order: field-level rules, form inputs and payload reference these. */
export const ORDER_FIELDS = {
	customerName: 'customerName',
	status: 'status',
	total: 'total'
} as const;

export const ORDER_STATUS = {
	draft: 'draft',
	confirmed: 'confirmed',
	shipped: 'shipped',
	cancelled: 'cancelled'
} as const;
/** Status of a new order in the form (the server applies the same default). */
export const DEFAULT_ORDER_STATUS = ORDER_STATUS.draft;

/** Server sort of the list: newest first. */
export const ORDER_SORT = { createdAtDesc: '-createdAt' } as const;
export const DEFAULT_ORDER_SORT = ORDER_SORT.createdAtDesc;

/** Validation codes of the order form: i18n codes (orders_validation_*), never user-facing text. */
export const ORDER_VALIDATION = {
	required: 'required',
	tooLong: 'tooLong',
	invalidAmount: 'invalidAmount'
} as const;

/** API path of the orders resource (relative to PUBLIC_API_BASE_URL). */
export const ORDERS_ENDPOINT = '/orders';
export const ORDER_STATS_ENDPOINT = `${ORDERS_ENDPOINT}/stats`;

/**
 * UI routes of the feature (SvelteKit route ids): literal types, so `resolve()` from $app/paths
 * checks them and their parameters.
 */
export const ORDER_ROUTES = {
	list: '/orders',
	create: '/orders/new',
	detail: '/orders/[id]',
	edit: '/orders/[id]/edit'
} as const;
