import { m } from '$lib/shared/i18n';
import type { OrderStatus, OrderValidationCode } from '../model/orders.schema';

const statusLabels: Record<OrderStatus, () => string> = {
	draft: () => m.orders_status_draft(),
	confirmed: () => m.orders_status_confirmed(),
	shipped: () => m.orders_status_shipped(),
	cancelled: () => m.orders_status_cancelled()
};

export function orderStatusLabel(status: OrderStatus): string {
	return statusLabels[status]();
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
