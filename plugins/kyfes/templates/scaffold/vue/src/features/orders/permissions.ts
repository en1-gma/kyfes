import { subject, type SubjectName } from '@/shared/rbac'
import type { Order } from './model/orders.schema'

/** CASL subject of the feature (registered in SUBJECTS of shared/rbac). */
export const ORDER_SUBJECT = 'Order' as const satisfies SubjectName

/** Tags an order for record-level rules: `can('update', orderSubject(order))`. */
export function orderSubject(order: Order) {
  return subject(ORDER_SUBJECT, order)
}
