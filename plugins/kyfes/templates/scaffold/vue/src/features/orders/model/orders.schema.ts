import { z } from 'zod'
import { VALIDATION_MESSAGE } from '@/shared/config/constants'
import { ORDER_STATUS, type OrderSort } from '../constants'

export const OrderStatusSchema = z.enum(ORDER_STATUS)
export const ORDER_STATUSES = OrderStatusSchema.options

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
    .min(1, { error: VALIDATION_MESSAGE.required })
    .max(120, { error: VALIDATION_MESSAGE.tooLong }),
  status: OrderStatusSchema,
  total: z.number({ error: VALIDATION_MESSAGE.invalid }).nonnegative({ error: VALIDATION_MESSAGE.positive }),
})

export const OrderStatsSchema = z.object({
  months: z.array(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/), total: z.number() })),
})

export type OrderStatus = z.infer<typeof OrderStatusSchema>
export type Order = z.infer<typeof OrderSchema>
export type OrderInput = z.infer<typeof OrderInputSchema>
export type OrderStats = z.infer<typeof OrderStatsSchema>

export type OrderFilters = { sort?: OrderSort | undefined; status?: OrderStatus | undefined }
