import { useState } from 'react';
import { Link } from 'react-router';
import { ACTIONS, useCan } from '@/shared/rbac';
import { formatCurrency, formatDate, useTranslation } from '@/shared/i18n';
import { Button, ConfirmDeleteDialog, ErrorState, LoadMore, QueryState } from '@/shared/ui';
import { useDeleteOrder } from '../api/orders.mutations';
import { useOrdersInfinite } from '../api/orders.queries';
import { ORDER_SUBJECT, ORDERS_NS, type OrderStatus } from '../constants';
import { ORDER_STATUSES, type Order } from '../model/orders.schema';
import { orderSubject } from '../permissions';
import { orderPaths } from '../routes';
import { useOrdersUiStore } from '../stores/orders-ui.store';
import { OrderStatusBadge } from './OrderStatusBadge';

export function OrdersTable() {
  const { t } = useTranslation(ORDERS_NS);
  const can = useCan();
  const status = useOrdersUiStore((s) => s.status);
  const sort = useOrdersUiStore((s) => s.sort);
  const setStatus = useOrdersUiStore((s) => s.setStatus);
  const query = useOrdersInfinite({ status, sort });
  const remove = useDeleteOrder();
  const [toDelete, setToDelete] = useState<Order | null>(null);

  // The actions column exists only if the user may act on at least some orders.
  const showActions = can(ACTIONS.update, ORDER_SUBJECT) || can(ACTIONS.delete, ORDER_SUBJECT);
  const orders = query.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <section className="stack" aria-labelledby="orders-list-title">
      <div className="toolbar">
        <h2 id="orders-list-title">{t('list.title')}</h2>
        <label className="field field--inline">
          <span>{t('list.filterStatus')}</span>
          <select
            value={status ?? ''}
            onChange={(e) => {
              setStatus(e.target.value === '' ? undefined : (e.target.value as OrderStatus));
            }}
          >
            <option value="">{t('list.allStatuses')}</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`status.${s}`)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <QueryState query={query} isEmpty={orders.length === 0} emptyMessage={t('list.empty')}>
        <>
          <div className="table-wrapper">
            <table className="table">
              <caption className="visually-hidden">{t('list.caption')}</caption>
              <thead>
                <tr>
                  <th scope="col">{t('columns.number')}</th>
                  <th scope="col">{t('columns.customer')}</th>
                  <th scope="col">{t('columns.status')}</th>
                  <th scope="col" className="num">
                    {t('columns.total')}
                  </th>
                  <th scope="col">{t('columns.createdAt')}</th>
                  {showActions && <th scope="col">{t('list.actions')}</th>}
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const record = orderSubject(order);
                  return (
                    <tr key={order.id}>
                      <td>
                        <Link
                          to={orderPaths.detail(order.id)}
                          aria-label={t('actions.view', { number: order.number })}
                        >
                          {order.number}
                        </Link>
                      </td>
                      <td>{order.customerName}</td>
                      <td>
                        <OrderStatusBadge status={order.status} />
                      </td>
                      <td className="num">{formatCurrency(order.total)}</td>
                      <td>{formatDate(order.createdAt)}</td>
                      {showActions && (
                        <td className="row-actions">
                          {can(ACTIONS.update, record) && (
                            <Link
                              className="btn btn--ghost"
                              to={orderPaths.edit(order.id)}
                              aria-label={t('actions.edit', { number: order.number })}
                            >
                              {t('common:actions.edit')}
                            </Link>
                          )}
                          {can(ACTIONS.delete, record) && (
                            <Button
                              variant="ghost"
                              aria-label={t('actions.delete', { number: order.number })}
                              onClick={() => {
                                setToDelete(order);
                              }}
                            >
                              {t('common:actions.delete')}
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <LoadMore summary={t('list.count', { count: orders.length })} query={query} />
        </>
      </QueryState>

      {remove.isError && <ErrorState error={remove.error} />}

      <ConfirmDeleteDialog
        item={toDelete}
        labels={{
          title: t('delete.title'),
          message: t('delete.message', { number: toDelete?.number ?? '' }),
          confirm: t('delete.confirm'),
        }}
        busy={remove.isPending}
        onConfirm={(order) => {
          remove.mutate(order);
        }}
        onClose={() => {
          setToDelete(null);
        }}
      />
    </section>
  );
}
