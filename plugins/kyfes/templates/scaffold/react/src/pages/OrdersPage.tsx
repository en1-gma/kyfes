import { Link } from 'react-router';
import { ORDER_SUBJECT, ORDERS_NS, OrdersChart, OrdersTable, orderPaths } from '@/features/orders';
import { useTranslation } from '@/shared/i18n';
import { ACTIONS, Can } from '@/shared/rbac';

export default function OrdersPage() {
  const { t } = useTranslation(ORDERS_NS);
  return (
    <div className="page stack">
      <title>{t('title')}</title>
      <header className="page__header">
        <h1>{t('title')}</h1>
        <Can I={ACTIONS.create} a={ORDER_SUBJECT}>
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
