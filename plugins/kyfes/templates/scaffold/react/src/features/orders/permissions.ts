import { subject } from '@/shared/rbac';
import { ORDER_FIELDS, ORDER_SUBJECT } from './constants';
import type { Order } from './model/orders.schema';

// Registers 'Order' in shared/rbac `Subjects` without shared/ importing this feature.
declare module '@/shared/rbac/ability' {
  interface SubjectRegistry {
    Order: Order;
  }
}

/** Record-level subject for conditions (`{ status: ORDER_STATUS.draft }`) and field checks. */
export function orderSubject(order: Order) {
  // Copy: CASL tags the object with its type, cached query data must stay untouched.
  return subject(ORDER_SUBJECT, { ...order });
}

/** Fields the user can edit, checked one by one against the field-level rules. */
export const ORDER_EDITABLE_FIELDS = [
  ORDER_FIELDS.customerName,
  ORDER_FIELDS.status,
  ORDER_FIELDS.total,
] as const satisfies readonly (keyof Order)[];
export type OrderEditableField = (typeof ORDER_EDITABLE_FIELDS)[number];
