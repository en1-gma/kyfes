import { subject, type AppAbility, type SubjectName } from '@/shared/rbac';
import type { Order } from './model/orders.schema';

/** CASL subject of the orders feature (registered in shared/rbac SUBJECTS). */
export const ORDER_SUBJECT = 'Order' as const satisfies SubjectName;

/** Tags a record so that conditions (e.g. `{ status: 'draft' }`) are evaluated on it. */
export function orderSubject(order: Order) {
  return subject(ORDER_SUBJECT, { ...order });
}

export function canEditOrder(ability: AppAbility, order: Order): boolean {
  return ability.can('update', orderSubject(order));
}

export function canDeleteOrder(ability: AppAbility, order: Order): boolean {
  return ability.can('delete', orderSubject(order));
}

export function canEditOrderStatus(ability: AppAbility, order: Order): boolean {
  return ability.can('update', orderSubject(order), 'status');
}
