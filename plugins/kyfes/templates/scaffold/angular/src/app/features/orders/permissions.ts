import { subject } from '@shared/rbac';
import { ORDER_FIELDS, ORDER_SUBJECT } from './constants';
import type { Order, OrderInput } from './model/orders.schema';

export { ORDER_FIELDS, ORDER_SUBJECT } from './constants';

export type OrderInputField = (typeof ORDER_FIELDS)[keyof typeof ORDER_FIELDS];
/** Tutti i campi del form; `satisfies` garantisce che `ORDER_FIELDS` copra esattamente `OrderInput`. */
export const ORDER_INPUT_FIELDS: readonly OrderInputField[] = Object.values(
  ORDER_FIELDS satisfies { [K in keyof OrderInput]: K },
);

/** Soggetto per il record specifico: abilita le condizioni CASL (es. `{ status: 'shipped' }`). */
export function orderSubject(order: Order) {
  return subject(ORDER_SUBJECT, { ...order });
}
