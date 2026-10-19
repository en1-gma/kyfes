import { subject } from '@/shared/rbac';
import type { Order } from './model/orders.schema';

/** CASL subject of the feature (kyfes §5). */
export const ORDER_SUBJECT = 'Order' as const;

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

/** Fields of Order named by the field-level rules (`can(action, subject, field)`, `fields`). */
export const ORDER_FIELDS = {
  customerName: 'customerName',
  status: 'status',
  total: 'total',
} as const satisfies Record<string, keyof Order>;

/** Fields the user can edit, checked one by one against the field-level rules. */
export const ORDER_EDITABLE_FIELDS = [
  ORDER_FIELDS.customerName,
  ORDER_FIELDS.status,
  ORDER_FIELDS.total,
] as const;
export type OrderEditableField = (typeof ORDER_EDITABLE_FIELDS)[number];
