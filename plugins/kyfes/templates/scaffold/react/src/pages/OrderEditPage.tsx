import { useNavigate, useParams } from 'react-router';
import { ORDER_DETAIL_MODE, ORDERS_NS, OrderDetail, orderPaths } from '@/features/orders';
import { useTranslation } from '@/shared/i18n';

export default function OrderEditPage() {
  const { t } = useTranslation(ORDERS_NS);
  const { orderId = '' } = useParams();
  const navigate = useNavigate();
  const toDetail = () => void navigate(orderPaths.detail(orderId));
  return (
    <div className="page stack">
      <title>{t('title')}</title>
      <OrderDetail orderId={orderId} mode={ORDER_DETAIL_MODE.edit} onSaved={toDetail} onCancel={toDetail} />
    </div>
  );
}
