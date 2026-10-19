'use client';

import { useTranslations } from '@/shared/i18n';
import type { OrderStatus } from '../model/orders.schema';

/** Status as text (colour is never the only carrier of information). */
export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const t = useTranslations('orders');
  return <span data-status={status}>{t(`status.${status}`)}</span>;
}
