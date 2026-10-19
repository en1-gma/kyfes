/** Modes of `<OrderDetail>`: read-only view or edit form. */
export const ORDER_DETAIL_MODE = {
  view: 'view',
  edit: 'edit',
} as const;
export type OrderDetailMode = (typeof ORDER_DETAIL_MODE)[keyof typeof ORDER_DETAIL_MODE];
