import { useNavigate } from 'react-router';
import { ORDERS_NS, OrderForm, orderPaths } from '@/features/orders';
import { useTranslation } from '@/shared/i18n';

export default function NewOrderPage() {
  const { t } = useTranslation(ORDERS_NS);
  const navigate = useNavigate();
  return (
    <div className="page stack">
      <title>{t('form.titleNew')}</title>
      <OrderForm
        onSaved={(order) => void navigate(orderPaths.detail(order.id))}
        onCancel={() => void navigate(orderPaths.list)}
      />
    </div>
  );
}
