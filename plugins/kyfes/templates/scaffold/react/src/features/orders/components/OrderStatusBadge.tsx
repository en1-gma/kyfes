import { useTranslation } from '@/shared/i18n';
import { ORDERS_NS } from '../constants';
import type { OrderStatus } from '../model/orders.schema';

/** Status as text + colour (colour is never the only information). */
export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useTranslation(ORDERS_NS);
  return <span className={`badge badge--${status}`}>{t(`status.${status}`)}</span>;
}
