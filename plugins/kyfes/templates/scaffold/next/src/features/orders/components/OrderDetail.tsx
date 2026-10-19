'use client';

import Link from 'next/link';
import { useFormatters, useTranslations } from '@/shared/i18n';
import { useAbility } from '@/shared/rbac';
import { QueryState, buttonClassName } from '@/shared/ui';
import { useOrder } from '../api/orders.queries';
import type { Order } from '../model/orders.schema';
import { canEditOrder } from '../permissions';
import { OrderStatusBadge } from './OrderStatusBadge';
import styles from './orders.module.css';

export function OrderDetail({ id }: { id: string }) {
  const query = useOrder(id);
  return (
    <QueryState query={query}>{query.data ? <OrderView order={query.data} /> : null}</QueryState>
  );
}

function OrderView({ order }: { order: Order }) {
  const t = useTranslations('orders');
  const { formatCurrency, formatDate } = useFormatters();
  const ability = useAbility();

  return (
    <article>
      <h1>{t('detail.title', { number: order.number })}</h1>
      <dl className={styles.details}>
        <dt>{t('columns.customer')}</dt>
        <dd>{order.customerName}</dd>
        <dt>{t('columns.status')}</dt>
        <dd>
          <OrderStatusBadge status={order.status} />
        </dd>
        <dt>{t('columns.total')}</dt>
        <dd>{formatCurrency(order.total)}</dd>
        <dt>{t('columns.createdAt')}</dt>
        <dd>{formatDate(order.createdAt, { dateStyle: 'long', timeStyle: 'short' })}</dd>
      </dl>
      <p className={styles.actions}>
        <Link href="/orders" className={buttonClassName()}>
          {t('detail.back')}
        </Link>
        {canEditOrder(ability, order) ? (
          <Link href={`/orders/${order.id}/edit`} className={buttonClassName('primary')}>
            {t('actions.edit')}
          </Link>
        ) : null}
      </p>
    </article>
  );
}
