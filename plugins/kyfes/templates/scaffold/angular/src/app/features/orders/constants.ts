import { SUBJECT } from '@shared/config/constants';

/**
 * Costanti della feature `orders`: unico punto in cui sono scritte. È una foglia: non importa
 * nulla dalla feature (solo le costanti trasversali di `shared/config/constants.ts`).
 */

/**
 * Nome della feature/risorsa: namespace i18n (`orders.*`), segmento delle rotte UI e radice
 * delle query key.
 */
export const ORDERS_FEATURE = 'orders';

/** Namespace i18n della feature: chiavi `orders.*`. */
export const ORDERS_NS = ORDERS_FEATURE;

/** Soggetto CASL della feature (registrato in `SUBJECT` di shared/config/constants.ts). */
export const ORDER_SUBJECT = SUBJECT.Order;

/** Campi del form (e del corpo) soggetti ai permessi per campo CASL: `ORDER_FIELDS.status`. */
export const ORDER_FIELDS = {
  customerName: 'customerName',
  total: 'total',
  status: 'status',
} as const;

/** Stati dell'ordine (`ORDER_STATUS.draft`): unica definizione, lo schema Zod la usa. */
export const ORDER_STATUS = {
  draft: 'draft',
  confirmed: 'confirmed',
  shipped: 'shipped',
  cancelled: 'cancelled',
} as const;

/** Stato di un ordine nuovo (anche lato server se `status` non è scrivibile). */
export const DEFAULT_ORDER_STATUS = ORDER_STATUS.draft;

/** Ordinamenti supportati dalla lista (`-campo` = discendente). */
export const ORDER_SORT = {
  createdAtDesc: '-createdAt',
} as const;

export const DEFAULT_ORDER_SORT = ORDER_SORT.createdAtDesc;

/** Risorsa REST della feature (relativa a `API_BASE_URL`). */
export const ORDERS_ENDPOINT = '/orders';
export const ORDER_STATS_ENDPOINT = `${ORDERS_ENDPOINT}/stats`;

/** Segmenti e parametri delle rotte UI della feature. */
export const ORDER_ID_PARAM = ':id';
export const ORDER_NEW_SEGMENT = 'new';
export const ORDER_EDIT_SEGMENT = 'edit';

/** Percorsi (relativi) delle rotte della feature, da usare in app.routes.ts. */
export const ORDER_ROUTE_PATHS = {
  root: ORDERS_FEATURE,
  list: '',
  new: ORDER_NEW_SEGMENT,
  detail: ORDER_ID_PARAM,
  edit: `${ORDER_ID_PARAM}/${ORDER_EDIT_SEGMENT}`,
} as const;

/** Prefisso delle chiavi i18n degli errori di campo (anche quelle restituite dal backend). */
export const ORDER_FORM_ERROR_PREFIX = 'orders.form.errors.';

/** Chiavi i18n degli errori di validazione del form (messaggi dello schema Zod). */
export const ORDER_FORM_ERROR = {
  customerRequired: 'orders.form.errors.customerRequired',
  customerTooLong: 'orders.form.errors.customerTooLong',
  totalInvalid: 'orders.form.errors.totalInvalid',
  totalNegative: 'orders.form.errors.totalNegative',
} as const;
