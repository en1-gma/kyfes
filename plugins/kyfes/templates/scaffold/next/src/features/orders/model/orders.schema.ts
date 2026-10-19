import { z } from 'zod';
import { pageSchema } from '@/shared/api';

export const ORDER_STATUS = {
  draft: 'draft',
  confirmed: 'confirmed',
  shipped: 'shipped',
  cancelled: 'cancelled',
} as const;
export const ORDER_STATUSES = [
  ORDER_STATUS.draft,
  ORDER_STATUS.confirmed,
  ORDER_STATUS.shipped,
  ORDER_STATUS.cancelled,
] as const;
/** Status of a new order when the user cannot choose it (the server applies the same default). */
export const DEFAULT_ORDER_STATUS = ORDER_STATUS.draft;
export const OrderStatusSchema = z.enum(ORDER_STATUSES);

export const OrderSchema = z.object({
  id: z.uuid(),
  number: z.string().min(1),
  customerName: z.string().min(1),
  status: OrderStatusSchema,
  total: z.number().nonnegative(),
  createdAt: z.iso.datetime({ offset: true }),
});

const TOTAL_INVALID = 'validation.totalInvalid';

/** Body of create/update. Messages are i18n keys of the `orders` namespace. */
export const OrderInputSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(1, 'validation.customerRequired')
    .max(120, 'validation.tooLong'),
  status: OrderStatusSchema,
  total: z.number({ error: TOTAL_INVALID }).nonnegative(TOTAL_INVALID),
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

/** Writable fields (CASL field permissions, form fields, server fieldErrors keys). */
export const ORDER_FIELD = {
  customerName: 'customerName',
  status: 'status',
  total: 'total',
} as const satisfies Record<OrderField, OrderField>;
export const ORDER_FIELDS = [
  ORDER_FIELD.customerName,
  ORDER_FIELD.status,
  ORDER_FIELD.total,
] as const satisfies readonly OrderField[];
export type OrderPage = z.infer<typeof OrderPageSchema>;
export type OrderStats = z.infer<typeof OrderStatsSchema>;

export interface OrderListFilters {
  status?: OrderStatus;
  sort?: string;
}
