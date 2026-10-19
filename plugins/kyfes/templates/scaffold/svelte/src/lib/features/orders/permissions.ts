import { subject, type AbilityState, type SubjectType } from '$lib/shared/rbac';
import type { Order, OrderField, OrderInput, OrderPayload } from './model/orders.schema';

/** CASL subject of the feature (registered in shared/rbac/subjects.ts). */
export const ORDER_SUBJECT = 'Order' satisfies SubjectType;

export const ORDER_FIELDS = ['customerName', 'status', 'total'] as const satisfies OrderField[];

/**
 * Tags a record for conditional rules (e.g. `{ status: 'draft' }`). Works on a copy:
 * CASL defines a property on the object, which must not touch cached/reactive data.
 */
export function asOrderSubject(order: Order) {
	return subject(ORDER_SUBJECT, { ...order });
}

/**
 * Field-level permission of the form: `create Order <field>` for a new order,
 * `update <record> <field>` for an existing one (conditions on the record apply).
 */
export function canWriteOrderField(
	ability: AbilityState,
	field: OrderField,
	order: Order | undefined
): boolean {
	return order
		? ability.can('update', asOrderSubject(order), field)
		: ability.can('create', ORDER_SUBJECT, field);
}

/** The payload never carries a field the user may not write (the server would answer 403). */
export function pickWritableFields(
	input: OrderInput,
	canWrite: (field: OrderField) => boolean
): OrderPayload {
	const payload: OrderPayload = {};
	if (canWrite('customerName')) payload.customerName = input.customerName;
	if (canWrite('status')) payload.status = input.status;
	if (canWrite('total')) payload.total = input.total;
	return payload;
}
