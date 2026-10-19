'use client';

import Link from 'next/link';
import { ORDER_SUBJECT, OrdersChart, OrdersTable } from '@/features/orders';
import { useTranslations } from '@/shared/i18n';
import { Can } from '@/shared/rbac';
import { buttonClassName } from '@/shared/ui';
import styles from '../app.module.css';

export default function OrdersPage() {
  const t = useTranslations('orders');
  return (
    <div className={styles.stack}>
      <div className={styles.pageHeader}>
        <h1>{t('list.title')}</h1>
        <Can I="create" a={ORDER_SUBJECT}>
          <Link href="/orders/new" className={buttonClassName('primary')}>
            {t('list.new')}
          </Link>
        </Can>
      </div>
      <OrdersChart />
      <OrdersTable />
    </div>
  );
}
