import { subject } from '@/shared/rbac'
import { ORDER_SUBJECT } from './constants'
import type { Order } from './model/orders.schema'

/** Tags an order for record-level rules: `can(ACTION.update, orderSubject(order))`. */
export function orderSubject(order: Order) {
  // Copy: CASL tags the object with its type, cached query data must stay untouched.
  return subject(ORDER_SUBJECT, { ...order })
}
