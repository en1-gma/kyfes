'use client';

import { useTranslations } from '@/shared/i18n';
import { ORDERS_NS } from '../locales/namespace';
import type { OrderStatus } from '../model/orders.schema';

/** Status as text (colour is never the only carrier of information). */
export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const t = useTranslations(ORDERS_NS);
  return <span data-status={status}>{t(`status.${status}`)}</span>;
}
