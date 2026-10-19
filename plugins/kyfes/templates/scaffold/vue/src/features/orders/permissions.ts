import { subject, type SubjectName } from '@/shared/rbac'
import type { Order } from './model/orders.schema'

/** CASL subject of the feature (registered in SUBJECTS of shared/rbac). */
export const ORDER_SUBJECT = 'Order' as const satisfies SubjectName

/** Tags an order for record-level rules: `can('update', orderSubject(order))`. */
export function orderSubject(order: Order) {
  // Copy: CASL tags the object with its type, cached query data must stay untouched.
  return subject(ORDER_SUBJECT, { ...order })
}

/** Fields of the order form, checked one by one against the field-level rules. */
export const ORDER_FIELDS = ['customerName', 'status', 'total'] as const
export type OrderField = (typeof ORDER_FIELDS)[number]
