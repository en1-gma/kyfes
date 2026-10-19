import { SUBJECT, subject } from '@/shared/rbac'
import type { Order } from './model/orders.schema'

/** CASL subject of the feature (registered in SUBJECT of shared/rbac). */
export const ORDER_SUBJECT = SUBJECT.Order

/** Tags an order for record-level rules: `can(ACTION.update, orderSubject(order))`. */
export function orderSubject(order: Order) {
  // Copy: CASL tags the object with its type, cached query data must stay untouched.
  return subject(ORDER_SUBJECT, { ...order })
}

/** Fields of the order form, checked one by one against the field-level rules. */
export const ORDER_FIELD = { customerName: 'customerName', status: 'status', total: 'total' } as const
export type OrderField = (typeof ORDER_FIELD)[keyof typeof ORDER_FIELD]
export const ORDER_FIELDS: readonly OrderField[] = Object.values(ORDER_FIELD)
