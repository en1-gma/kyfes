'use client';

import Link from 'next/link';
import { ORDERS_NS, ORDER_SUBJECT, OrdersChart, OrdersTable, orderPaths } from '@/features/orders';
import { useTranslations } from '@/shared/i18n';
import { ACTION, Can } from '@/shared/rbac';
import { BUTTON_VARIANT, buttonClassName } from '@/shared/ui';
import styles from '../app.module.css';

export default function OrdersPage() {
  const t = useTranslations(ORDERS_NS);
  return (
    <div className={styles.stack}>
      <div className={styles.pageHeader}>
        <h1>{t('list.title')}</h1>
        <Can I={ACTION.create} a={ORDER_SUBJECT}>
          <Link href={orderPaths.new} className={buttonClassName(BUTTON_VARIANT.primary)}>
            {t('list.new')}
          </Link>
        </Can>
      </div>
      <OrdersChart />
      <OrdersTable />
    </div>
  );
}
