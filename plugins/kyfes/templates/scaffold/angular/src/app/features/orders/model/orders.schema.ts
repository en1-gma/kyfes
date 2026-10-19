import * as z from 'zod';
import { DEFAULT_ORDER_STATUS, ORDER_FORM_ERROR, ORDER_STATUS } from '../constants';

export const OrderStatusSchema = z.enum(ORDER_STATUS);
export const ORDER_STATUSES = OrderStatusSchema.options;

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
    .min(1, { error: ORDER_FORM_ERROR.customerRequired })
    .max(120, { error: ORDER_FORM_ERROR.customerTooLong }),
  status: OrderStatusSchema,
  total: z
    .number({ error: ORDER_FORM_ERROR.totalInvalid })
    .nonnegative({ error: ORDER_FORM_ERROR.totalNegative }),
});

/** Create: solo i campi scrivibili; senza permesso su `status` il server usa `draft`. */
export const OrderCreateSchema = OrderInputSchema.extend({
  status: OrderStatusSchema.default(DEFAULT_ORDER_STATUS),
});

/** Update parziale (PATCH): ogni campo è facoltativo, si inviano solo quelli scrivibili. */
export const OrderPatchSchema = OrderInputSchema.partial();

export const OrderStatsSchema = z.object({
  months: z.array(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/), total: z.number() })),
});

export type Order = z.infer<typeof OrderSchema>;
export type OrderStatus = z.infer<typeof OrderStatusSchema>;
export type OrderInput = z.infer<typeof OrderInputSchema>;
export type OrderPatch = z.infer<typeof OrderPatchSchema>;
export type OrderStats = z.infer<typeof OrderStatsSchema>;

export interface OrderListFilters {
  limit: number;
  sort?: string;
  status?: OrderStatus;
}
