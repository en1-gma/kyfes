import { m } from '$lib/shared/i18n';
import type { OrderStatus, OrderValidationCode } from '../model/orders.schema';

export function orderStatusLabel(status: OrderStatus): string {
	switch (status) {
		case 'draft':
			return m.orders_status_draft();
		case 'confirmed':
			return m.orders_status_confirmed();
		case 'shipped':
			return m.orders_status_shipped();
		case 'cancelled':
			return m.orders_status_cancelled();
	}
}

export function validationMessage(code: string | undefined): string | undefined {
	const messages: Record<OrderValidationCode, () => string> = {
		required: () => m.orders_validation_required(),
		tooLong: () => m.orders_validation_too_long(),
		invalidAmount: () => m.orders_validation_amount()
	};
	return code
		? (messages[code as OrderValidationCode]?.() ?? m.orders_validation_invalid())
		: undefined;
}
