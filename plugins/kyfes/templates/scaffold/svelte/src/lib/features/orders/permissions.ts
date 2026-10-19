import { subject, type SubjectType } from '$lib/shared/rbac';
import type { Order } from './model/orders.schema';

/** CASL subject of the feature (registered in shared/rbac/subjects.ts). */
export const ORDER_SUBJECT = 'Order' satisfies SubjectType;

/**
 * Tags a record for conditional rules (e.g. `{ status: 'draft' }`). Works on a copy:
 * CASL defines a property on the object, which must not touch cached/reactive data.
 */
export function asOrderSubject(order: Order) {
	return subject(ORDER_SUBJECT, { ...order });
}
