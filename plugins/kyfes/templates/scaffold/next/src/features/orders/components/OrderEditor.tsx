'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from '@/shared/i18n';
import { useAbility } from '@/shared/rbac';
import { ForbiddenPage, QueryState } from '@/shared/ui';
import { useCreateOrder, useUpdateOrder } from '../api/orders.mutations';
import { useOrder } from '../api/orders.queries';
import type { Order } from '../model/orders.schema';
import { canEditOrder } from '../permissions';
import { OrderForm } from './OrderForm';

/** New order: form + create mutation, then navigation to the detail. */
export function NewOrder() {
  const t = useTranslations('orders');
  const router = useRouter();
  const create = useCreateOrder();
  return (
    <section>
      <h1>{t('form.newTitle')}</h1>
      <OrderForm
        isSubmitting={create.isPending}
        error={create.error}
        // Only writable fields: the server defaults the others (e.g. status = draft).
        onSubmit={(input) =>
          create.mutate(input, { onSuccess: (order) => router.push(`/orders/${order.id}`) })
        }
      />
    </section>
  );
}

function OrderEditForm({ order }: { order: Order }) {
  const t = useTranslations('orders');
  const router = useRouter();
  const ability = useAbility();
  const update = useUpdateOrder(order.id);

  // Record-level check (e.g. `update` only on drafts): the route guard only knows the type.
  if (!canEditOrder(ability, order)) return <ForbiddenPage />;

  return (
    <section>
      <h1>{t('form.editTitle', { number: order.number })}</h1>
      <OrderForm
        order={order}
        isSubmitting={update.isPending}
        error={update.error}
        onSubmit={(input) =>
          update.mutate(input, { onSuccess: () => router.push(`/orders/${order.id}`) })
        }
      />
    </section>
  );
}

/** Edit order: loads the record, checks `update` on it, then form + PATCH of writable fields. */
export function EditOrder({ id }: { id: string }) {
  const query = useOrder(id);
  return (
    <QueryState query={query}>
      {query.data ? <OrderEditForm order={query.data} /> : null}
    </QueryState>
  );
}
