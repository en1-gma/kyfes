import { Subject, subject } from '@shared/rbac';
import type { Order, OrderInput } from './model/orders.schema';

/** Soggetto CASL della feature (registrato in shared/rbac/subjects.ts). */
export const ORDER_SUBJECT = Subject.Order;

/** Campi del form (e del corpo) soggetti ai permessi per campo CASL: `ORDER_FIELDS.status`. */
export const ORDER_FIELDS = {
  customerName: 'customerName',
  total: 'total',
  status: 'status',
} as const satisfies { [K in keyof OrderInput]: K };
export type OrderInputField = (typeof ORDER_FIELDS)[keyof typeof ORDER_FIELDS];
export const ORDER_INPUT_FIELDS: readonly OrderInputField[] = Object.values(ORDER_FIELDS);

/** Soggetto per il record specifico: abilita le condizioni CASL (es. `{ status: 'shipped' }`). */
export function orderSubject(order: Order) {
  return subject(ORDER_SUBJECT, { ...order });
}
