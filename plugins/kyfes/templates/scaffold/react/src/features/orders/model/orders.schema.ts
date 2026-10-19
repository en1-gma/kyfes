import { z } from 'zod';
import { pageSchema } from '@/shared/api';
import { VALIDATION_KEYS } from '@/shared/i18n';

export const ORDER_STATUS = {
  draft: 'draft',
  confirmed: 'confirmed',
  shipped: 'shipped',
  cancelled: 'cancelled',
} as const;
export const OrderStatusSchema = z.enum(ORDER_STATUS);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;
/** Statuses in display order (filters, selects). */
export const ORDER_STATUSES = OrderStatusSchema.options;

/** Status of a new order when the client does not send one (applied by the server). */
export const DEFAULT_ORDER_STATUS: OrderStatus = ORDER_STATUS.draft;

export const OrderSchema = z.object({
  id: z.uuid(),
  number: z.string(),
  customerName: z.string(),
  status: OrderStatusSchema,
  total: z.number(),
  createdAt: z.iso.datetime({ offset: true }),
});
export type Order = z.infer<typeof OrderSchema>;

export const OrderPageSchema = pageSchema(OrderSchema);
export type OrderPage = z.infer<typeof OrderPageSchema>;

/**
 * Create/update payload. Error messages are i18n keys of the `common` namespace
 * (`validation.*`): the form translates them.
 */
export const OrderInputSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(1, { error: VALIDATION_KEYS.required })
    .max(120, { error: VALIDATION_KEYS.maxLength }),
  status: OrderStatusSchema,
  total: z
    .number({ error: VALIDATION_KEYS.invalid })
    .nonnegative({ error: VALIDATION_KEYS.nonNegative })
    .multipleOf(0.01, { error: VALIDATION_KEYS.invalid }),
});
export type OrderInput = z.infer<typeof OrderInputSchema>;

export const OrderStatsSchema = z.object({
  /** Totals per month, `month` = "YYYY-MM", oldest first. */
  months: z.array(
    z.object({ month: z.string().regex(/^\d{4}-\d{2}$/), total: z.number(), count: z.number().int() }),
  ),
});
export type OrderStats = z.infer<typeof OrderStatsSchema>;

/** Sort orders accepted by the list endpoint (`field:direction`). */
export const ORDER_SORT = {
  createdAtDesc: 'createdAt:desc',
  createdAtAsc: 'createdAt:asc',
  totalDesc: 'total:desc',
} as const;
export type OrderSort = (typeof ORDER_SORT)[keyof typeof ORDER_SORT];
export const DEFAULT_ORDER_SORT: OrderSort = ORDER_SORT.createdAtDesc;

/** List filters: part of the query key. */
export interface OrderListFilters {
  status?: OrderStatus | undefined;
  sort?: OrderSort | undefined;
  limit?: number | undefined;
}
