import { z } from 'zod'

export const ORDER_STATUS = {
  draft: 'draft',
  confirmed: 'confirmed',
  shipped: 'shipped',
  cancelled: 'cancelled',
} as const
export const OrderStatusSchema = z.enum(ORDER_STATUS)
export const ORDER_STATUSES = OrderStatusSchema.options
/** Status of a new order. */
export const DEFAULT_ORDER_STATUS = ORDER_STATUS.draft

/** List sort (`-` = descending), as sent to the API. */
export const ORDER_SORT = { createdAtAsc: 'createdAt', createdAtDesc: '-createdAt' } as const
export type OrderSort = (typeof ORDER_SORT)[keyof typeof ORDER_SORT]
export const DEFAULT_ORDER_SORT: OrderSort = ORDER_SORT.createdAtDesc

export const OrderSchema = z.object({
  id: z.uuid(),
  number: z.string(),
  customerName: z.string(),
  status: OrderStatusSchema,
  total: z.number(),
  createdAt: z.iso.datetime({ offset: true }),
})

/** Validation messages are i18n keys (translated by the form). */
export const OrderInputSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(1, { error: 'common.validation.required' })
    .max(120, { error: 'common.validation.tooLong' }),
  status: OrderStatusSchema,
  total: z
    .number({ error: 'common.validation.invalid' })
    .nonnegative({ error: 'common.validation.positive' }),
})

export const OrderStatsSchema = z.object({
  months: z.array(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/), total: z.number() })),
})

export type OrderStatus = z.infer<typeof OrderStatusSchema>
export type Order = z.infer<typeof OrderSchema>
export type OrderInput = z.infer<typeof OrderInputSchema>
export type OrderStats = z.infer<typeof OrderStatsSchema>

export type OrderFilters = { sort?: OrderSort | undefined; status?: OrderStatus | undefined }
