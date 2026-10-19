'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useFormatters, useTranslations } from '@/shared/i18n';
import { useAbility } from '@/shared/rbac';
import {
  Button,
  ConfirmDeleteDialog,
  ErrorState,
  LoadMore,
  QueryState,
  buttonClassName,
} from '@/shared/ui';
import { useDeleteOrder } from '../api/orders.mutations';
import { useOrdersInfinite } from '../api/orders.queries';
import { ORDER_STATUSES, type Order, type OrderStatus } from '../model/orders.schema';
import { ORDER_SUBJECT, canDeleteOrder, canEditOrder } from '../permissions';
import { useOrdersUiStore } from '../stores/orders-ui.store';
import { OrderStatusBadge } from './OrderStatusBadge';
import styles from './orders.module.css';

/** Infinite list of orders; CRUD actions rendered only when allowed (per record). */
export function OrdersTable() {
  const t = useTranslations('orders');
  const { formatCurrency, formatDate } = useFormatters();
  const ability = useAbility();
  const status = useOrdersUiStore((s) => s.status);
  const setStatus = useOrdersUiStore((s) => s.setStatus);
  const query = useOrdersInfinite({ status });
  const deleteOrder = useDeleteOrder();
  const [toDelete, setToDelete] = useState<Order | null>(null);

  const showActions = ability.can('update', ORDER_SUBJECT) || ability.can('delete', ORDER_SUBJECT);
  const orders = query.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div>
      <div className={styles.toolbar}>
        <label className={styles.field}>
          <span>{t('filters.status')}</span>
          <select
            value={status ?? ''}
            onChange={(e) => setStatus((e.target.value || undefined) as OrderStatus | undefined)}
          >
            <option value="">{t('filters.all')}</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`status.${s}`)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <QueryState query={query} isEmpty={orders.length === 0} emptyMessage={t('list.empty')}>
        <table className={styles.table}>
          <caption className="visually-hidden">{t('list.caption')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('columns.number')}</th>
              <th scope="col">{t('columns.customer')}</th>
              <th scope="col">{t('columns.status')}</th>
              <th scope="col" className={styles.numeric}>
                {t('columns.total')}
              </th>
              <th scope="col">{t('columns.createdAt')}</th>
              {showActions ? <th scope="col">{t('columns.actions')}</th> : null}
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>
                  <Link
                    href={`/orders/${order.id}`}
                    aria-label={t('actions.view', { number: order.number })}
                  >
                    {order.number}
                  </Link>
                </td>
                <td>{order.customerName}</td>
                <td>
                  <OrderStatusBadge status={order.status} />
                </td>
                <td className={styles.numeric}>{formatCurrency(order.total)}</td>
                <td>{formatDate(order.createdAt)}</td>
                {showActions ? (
                  <td>
                    <div className={styles.actions}>
                      {canEditOrder(ability, order) ? (
                        <Link
                          href={`/orders/${order.id}/edit`}
                          className={buttonClassName()}
                          aria-label={t('actions.editLabel', { number: order.number })}
                        >
                          {t('actions.edit')}
                        </Link>
                      ) : null}
                      {canDeleteOrder(ability, order) ? (
                        <Button
                          variant="danger"
                          onClick={() => setToDelete(order)}
                          aria-label={t('actions.deleteLabel', { number: order.number })}
                        >
                          {t('actions.delete')}
                        </Button>
                      ) : null}
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
        <LoadMore summary={t('list.loaded', { count: orders.length })} query={query} />
      </QueryState>

      {deleteOrder.isError ? <ErrorState error={deleteOrder.error} /> : null}

      <ConfirmDeleteDialog
        item={toDelete}
        labels={{
          title: t('delete.title'),
          message: toDelete ? t('delete.message', { number: toDelete.number }) : '',
          confirm: t('actions.delete'),
        }}
        onConfirm={(order) => deleteOrder.mutate(order.id)}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
