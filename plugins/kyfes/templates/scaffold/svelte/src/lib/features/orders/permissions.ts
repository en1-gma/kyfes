import { Action, Subject, subject, type AbilityState } from '$lib/shared/rbac';
import type { Order, OrderField, OrderInput, OrderPayload } from './model/orders.schema';

/** CASL subject of the feature (the name is registered in shared/rbac/subjects.ts). */
export const ORDER_SUBJECT = Subject.Order;

/** Writable fields of an order: field-level rules, form inputs and payload reference these. */
export const ORDER_FIELDS = {
	customerName: 'customerName',
	status: 'status',
	total: 'total'
} as const satisfies { [F in OrderField]: F };
export const ORDER_FIELD_NAMES: readonly OrderField[] = Object.values(ORDER_FIELDS);

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
		? ability.can(Action.Update, asOrderSubject(order), field)
		: ability.can(Action.Create, ORDER_SUBJECT, field);
}

/** The payload never carries a field the user may not write (the server would answer 403). */
export function pickWritableFields(
	input: OrderInput,
	canWrite: (field: OrderField) => boolean
): OrderPayload {
	const payload: OrderPayload = {};
	const copy = <F extends OrderField>(field: F) => {
		payload[field] = input[field];
	};
	ORDER_FIELD_NAMES.filter(canWrite).forEach(copy);
	return payload;
}
