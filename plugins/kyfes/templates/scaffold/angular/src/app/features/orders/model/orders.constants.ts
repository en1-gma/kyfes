/**
 * Nome della feature/risorsa: namespace i18n (`orders.*`), segmento delle rotte UI e radice
 * delle query key. Scritto solo qui.
 */
export const ORDERS_FEATURE = 'orders';

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
