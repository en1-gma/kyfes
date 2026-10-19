import { z } from 'zod';

export const ORDER_STATUS = {
	draft: 'draft',
	confirmed: 'confirmed',
	shipped: 'shipped',
	cancelled: 'cancelled'
} as const;
export const OrderStatusSchema = z.enum(ORDER_STATUS);
export const ORDER_STATUSES = OrderStatusSchema.options;
/** Status of a new order in the form (the server applies the same default). */
export const DEFAULT_ORDER_STATUS = ORDER_STATUS.draft;

/** Server sort of the list: newest first. */
export const ORDER_SORT = { createdAtDesc: '-createdAt' } as const;
export const DEFAULT_ORDER_SORT = ORDER_SORT.createdAtDesc;

/** Validation codes of the order form: i18n codes (orders_validation_*), never user-facing text. */
export const ORDER_VALIDATION = {
	required: 'required',
	tooLong: 'tooLong',
	invalidAmount: 'invalidAmount'
} as const;

export const OrderSchema = z.object({
	id: z.uuid(),
	number: z.string().min(1),
	customerName: z.string().min(1),
	status: OrderStatusSchema,
	total: z.number().nonnegative(),
	createdAt: z.iso.datetime({ offset: true })
});

const invalidAmount = { error: ORDER_VALIDATION.invalidAmount };

/** Validation of the order form. Error messages are the ORDER_VALIDATION codes. */
export const OrderInputSchema = z.object({
	customerName: z
		.string()
		.trim()
		.min(1, { error: ORDER_VALIDATION.required })
		.max(120, { error: ORDER_VALIDATION.tooLong }),
	status: OrderStatusSchema,
	total: z.number(invalidAmount).nonnegative(invalidAmount).max(1_000_000_000, invalidAmount)
});

/**
 * Body of POST /orders and PATCH /orders/:id: only the fields the user may write (field-level
 * permissions), so every field is optional; the server applies its defaults (e.g. `status`).
 */
export const OrderPayloadSchema = OrderInputSchema.partial();

export const OrderStatsSchema = z.object({
	months: z.array(
		z.object({
			month: z.string().regex(/^\d{4}-\d{2}$/),
			total: z.number(),
			count: z.number().int().nonnegative()
		})
	)
});

export type OrderStatus = z.infer<typeof OrderStatusSchema>;
export type Order = z.infer<typeof OrderSchema>;
export type OrderInput = z.infer<typeof OrderInputSchema>;
export type OrderPayload = z.infer<typeof OrderPayloadSchema>;
export type OrderField = keyof OrderInput;
export type OrderStats = z.infer<typeof OrderStatsSchema>;
export type OrderValidationCode = (typeof ORDER_VALIDATION)[keyof typeof ORDER_VALIDATION];
