import * as z from 'zod';

export const ORDER_STATUSES = ['draft', 'confirmed', 'shipped', 'cancelled'] as const;
export const OrderStatusSchema = z.enum(ORDER_STATUSES);

export const OrderSchema = z.object({
  id: z.uuid(),
  number: z.string(),
  customerName: z.string(),
  status: OrderStatusSchema,
  total: z.number(),
  createdAt: z.iso.datetime({ offset: true }),
});

/** Corpo di create/update. I messaggi sono chiavi i18n (tradotte nel form). */
export const OrderInputSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(1, { error: 'orders.form.errors.customerRequired' })
    .max(120, { error: 'orders.form.errors.customerTooLong' }),
  status: OrderStatusSchema,
  total: z
    .number({ error: 'orders.form.errors.totalInvalid' })
    .nonnegative({ error: 'orders.form.errors.totalNegative' }),
});

export const OrderStatsSchema = z.object({
  months: z.array(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/), total: z.number() })),
});

export type Order = z.infer<typeof OrderSchema>;
export type OrderStatus = z.infer<typeof OrderStatusSchema>;
export type OrderInput = z.infer<typeof OrderInputSchema>;
export type OrderStats = z.infer<typeof OrderStatsSchema>;

export interface OrderListFilters {
  limit: number;
  sort?: string;
  status?: OrderStatus;
}
