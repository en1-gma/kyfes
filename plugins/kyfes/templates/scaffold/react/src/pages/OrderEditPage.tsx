import { useNavigate, useParams } from 'react-router';
import { OrderDetail, orderPaths } from '@/features/orders';
import { useTranslation } from '@/shared/i18n';

export default function OrderEditPage() {
  const { t } = useTranslation('orders');
  const { orderId = '' } = useParams();
  const navigate = useNavigate();
  const toDetail = () => void navigate(orderPaths.detail(orderId));
  return (
    <div className="page stack">
      <title>{t('title')}</title>
      <OrderDetail orderId={orderId} mode="edit" onSaved={toDetail} onCancel={toDetail} />
    </div>
  );
}
