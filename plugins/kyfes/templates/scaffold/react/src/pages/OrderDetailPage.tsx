import { Link, useParams } from 'react-router';
import { ORDERS_NS, OrderDetail, orderPaths } from '@/features/orders';
import { useTranslation } from '@/shared/i18n';

export default function OrderDetailPage() {
  const { t } = useTranslation(ORDERS_NS);
  const { orderId = '' } = useParams();
  return (
    <div className="page stack">
      <title>{t('title')}</title>
      <Link to={orderPaths.list}>{t('common:actions.back')}</Link>
      <OrderDetail orderId={orderId} />
    </div>
  );
}
