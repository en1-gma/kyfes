import { z } from 'zod';
import { pageSchema } from '@/shared/api';

export const ORDER_STATUSES = ['draft', 'confirmed', 'shipped', 'cancelled'] as const;
export const OrderStatusSchema = z.enum(ORDER_STATUSES);

export const OrderSchema = z.object({
  id: z.uuid(),
  number: z.string().min(1),
  customerName: z.string().min(1),
  status: OrderStatusSchema,
  total: z.number().nonnegative(),
  createdAt: z.iso.datetime({ offset: true }),
});

/** Body of create/update. Messages are i18n keys of the `orders` namespace. */
export const OrderInputSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(1, 'validation.customerRequired')
    .max(120, 'validation.tooLong'),
  status: OrderStatusSchema,
  total: z.number({ error: 'validation.totalInvalid' }).nonnegative('validation.totalInvalid'),
});

export const OrderPageSchema = pageSchema(OrderSchema);

export const OrderStatsSchema = z.object({
  items: z.array(
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
export type OrderPage = z.infer<typeof OrderPageSchema>;
export type OrderStats = z.infer<typeof OrderStatsSchema>;

export interface OrderListFilters {
  status?: OrderStatus;
  sort?: string;
}
