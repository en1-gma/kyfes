import { Link } from 'react-router';
import { isApiError } from '@/shared/api';
import { Can } from '@/shared/rbac';
import { formatCurrency, formatDate, useTranslation } from '@/shared/i18n';
import { EmptyState, ForbiddenState, QueryState } from '@/shared/ui';
import { useOrder } from '../api/orders.queries';
import type { Order } from '../model/orders.schema';
import { orderSubject } from '../permissions';
import { orderPaths } from '../routes';
import { OrderForm } from './OrderForm';
import { OrderStatusBadge } from './OrderStatusBadge';

interface OrderDetailProps {
  orderId: string;
  mode?: 'view' | 'edit';
  onSaved?: ((order: Order) => void) | undefined;
  onCancel?: (() => void) | undefined;
}

export function OrderDetail({ orderId, mode = 'view', onSaved, onCancel }: OrderDetailProps) {
  const { t } = useTranslation('orders');
  const query = useOrder(orderId);
  const { data: order, error } = query;

  if (isApiError(error) && error.isNotFound) return <EmptyState message={t('detail.notFound')} />;
  if (!order) return <QueryState query={query}>{null}</QueryState>;

  if (mode === 'edit') {
    return (
      <Can I="update" this={orderSubject(order)} passThrough>
        {({ isAllowed }) =>
          isAllowed ? <OrderForm order={order} onSaved={onSaved} onCancel={onCancel} /> : <ForbiddenState />
        }
      </Can>
    );
  }

  return (
    <article className="stack" aria-labelledby="order-title">
      <div className="toolbar">
        <h2 id="order-title">{t('detail.title', { number: order.number })}</h2>
        <Can I="update" this={orderSubject(order)}>
          <Link className="btn btn--primary" to={orderPaths.edit(order.id)}>
            {t('common:actions.edit')}
          </Link>
        </Can>
      </div>
      <dl className="details">
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
    </article>
  );
}
