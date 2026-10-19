import { z } from 'zod';

export const ORDER_STATUSES = ['draft', 'confirmed', 'shipped', 'cancelled'] as const;
export const OrderStatusSchema = z.enum(ORDER_STATUSES);

export const OrderSchema = z.object({
	id: z.uuid(),
	number: z.string().min(1),
	customerName: z.string().min(1),
	status: OrderStatusSchema,
	total: z.number().nonnegative(),
	createdAt: z.iso.datetime({ offset: true })
});

/**
 * Body of POST/PUT /orders. Error messages are i18n codes (mapped to orders_validation_*),
 * never user-facing text.
 */
export const OrderInputSchema = z.object({
	customerName: z.string().trim().min(1, { error: 'required' }).max(120, { error: 'tooLong' }),
	status: OrderStatusSchema,
	total: z
		.number({ error: 'invalidAmount' })
		.nonnegative({ error: 'invalidAmount' })
		.max(1_000_000_000, { error: 'invalidAmount' })
});

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
export type OrderStats = z.infer<typeof OrderStatsSchema>;
export type OrderValidationCode = 'required' | 'tooLong' | 'invalidAmount';
