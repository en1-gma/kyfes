import { Link } from 'react-router';
import { ORDER_SUBJECT, OrdersChart, OrdersTable, orderPaths } from '@/features/orders';
import { useTranslation } from '@/shared/i18n';
import { Can } from '@/shared/rbac';

export default function OrdersPage() {
  const { t } = useTranslation('orders');
  return (
    <div className="page stack">
      <title>{t('title')}</title>
      <header className="page__header">
        <h1>{t('title')}</h1>
        <Can I="create" a={ORDER_SUBJECT}>
          <Link className="btn btn--primary" to={orderPaths.new}>
            {t('actions.new')}
          </Link>
        </Can>
      </header>
      <OrdersChart />
      <OrdersTable />
    </div>
  );
}
