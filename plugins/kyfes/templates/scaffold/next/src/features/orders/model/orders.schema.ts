import { z } from 'zod';
import { pageSchema } from '@/shared/api';
import {
  DEFAULT_ORDER_STATUS,
  ORDER_FIELD,
  ORDER_FIELDS,
  ORDER_STATUS,
  ORDER_STATUSES,
  ORDER_VALIDATION,
} from '../constants';

export { DEFAULT_ORDER_STATUS, ORDER_FIELD, ORDER_FIELDS, ORDER_STATUS, ORDER_STATUSES };
export const OrderStatusSchema = z.enum(ORDER_STATUSES);

export const OrderSchema = z.object({
  id: z.uuid(),
  number: z.string().min(1),
  customerName: z.string().min(1),
  status: OrderStatusSchema,
  total: z.number().nonnegative(),
  createdAt: z.iso.datetime({ offset: true }),
});

/**
 * Body of create/update, keyed by ORDER_FIELD (so `OrderField` is exactly its values).
 * Messages are i18n keys of the `orders` namespace.
 */
export const OrderInputSchema = z.object({
  [ORDER_FIELD.customerName]: z
    .string()
    .trim()
    .min(1, ORDER_VALIDATION.customerRequired)
    .max(120, ORDER_VALIDATION.tooLong),
  [ORDER_FIELD.status]: OrderStatusSchema,
  [ORDER_FIELD.total]: z
    .number({ error: ORDER_VALIDATION.totalInvalid })
    .nonnegative(ORDER_VALIDATION.totalInvalid),
});

export const OrderPageSchema = pageSchema(OrderSchema);

/** GET /orders/stats: `{ months: [{ month: 'YYYY-MM', total, count }] }` (same as every scaffold). */
export const OrderStatsSchema = z.object({
  months: z.array(
    z.object({
      month: z.string().regex(/^\d{4}-\d{2}$/),
      total: z.number(),
      count: z.number().int().nonnegative(),
    }),
  ),
});

export type OrderStatus = z.infer<typeof OrderStatusSchema>;
export type Order = z.infer<typeof OrderSchema>;
export type OrderInput = z.infer<typeof OrderInputSchema>;
export type OrderField = keyof OrderInput;
/** Write payload: only the fields the user may write (create omits what the server defaults). */
export type OrderWrite = Partial<OrderInput>;

export type OrderPage = z.infer<typeof OrderPageSchema>;
export type OrderStats = z.infer<typeof OrderStatsSchema>;

export interface OrderListFilters {
  status?: OrderStatus;
  sort?: string;
}
