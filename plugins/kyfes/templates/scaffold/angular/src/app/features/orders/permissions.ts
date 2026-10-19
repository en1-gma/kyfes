import { type SubjectName, subject } from '@shared/rbac';
import type { Order } from './model/orders.schema';

/** Soggetto CASL della feature (registrato in shared/rbac/subjects.ts). */
export const ORDER_SUBJECT = 'Order' satisfies SubjectName;

/** Soggetto per il record specifico: abilita le condizioni CASL (es. `{ status: 'shipped' }`). */
export function orderSubject(order: Order) {
  return subject(ORDER_SUBJECT, { ...order });
}
