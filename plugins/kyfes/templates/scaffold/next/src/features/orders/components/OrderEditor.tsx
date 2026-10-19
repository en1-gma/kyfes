'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from '@/shared/i18n';
import { ErrorState, Loading } from '@/shared/ui';
import { useCreateOrder, useUpdateOrder } from '../api/orders.mutations';
import { useOrder } from '../api/orders.queries';
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
        onSubmit={(input) =>
          create.mutate(
            { status: 'draft', ...input },
            { onSuccess: (order) => router.push(`/orders/${order.id}`) },
          )
        }
      />
    </section>
  );
}

/** Edit order: loads the record, then form + update mutation. */
export function EditOrder({ id }: { id: string }) {
  const t = useTranslations('orders');
  const router = useRouter();
  const { data: order, isPending, isError, error, refetch } = useOrder(id);
  const update = useUpdateOrder(id);

  if (isPending) return <Loading />;
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;

  return (
    <section>
      <h1>{t('form.editTitle', { number: order.number })}</h1>
      <OrderForm
        order={order}
        isSubmitting={update.isPending}
        error={update.error}
        onSubmit={(input) =>
          update.mutate(input, { onSuccess: () => router.push(`/orders/${id}`) })
        }
      />
    </section>
  );
}
