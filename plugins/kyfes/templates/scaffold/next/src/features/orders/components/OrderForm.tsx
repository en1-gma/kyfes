'use client';

import { useId } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from '@/shared/i18n';
import { useAbility } from '@/shared/rbac';
import { Button, ErrorState } from '@/shared/ui';
import {
  ORDER_STATUSES,
  OrderInputSchema,
  type Order,
  type OrderInput,
} from '../model/orders.schema';
import { ORDER_SUBJECT, canEditOrderStatus } from '../permissions';
import styles from './orders.module.css';

export interface OrderFormProps {
  order?: Order;
  onSubmit: (input: OrderInput | Omit<OrderInput, 'status'>) => void;
  isSubmitting?: boolean;
  error?: unknown;
}

/** Create/edit form validated with Zod; `status` is read-only without field permission. */
export function OrderForm({ order, onSubmit, isSubmitting = false, error }: OrderFormProps) {
  const t = useTranslations('orders');
  const ability = useAbility();
  const ids = { customer: useId(), status: useId(), total: useId() };
  const statusEditable = order
    ? canEditOrderStatus(ability, order)
    : ability.can('create', ORDER_SUBJECT, 'status');

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<OrderInput>({
    resolver: zodResolver(OrderInputSchema),
    defaultValues: {
      customerName: order?.customerName ?? '',
      status: order?.status ?? 'draft',
      total: order?.total ?? 0,
    },
  });

  const submit = handleSubmit((values) => {
    if (statusEditable) return onSubmit(values);
    // Read-only field: never sent, the server keeps the current value.
    return onSubmit({ customerName: values.customerName, total: values.total });
  });

  const message = (key: string | undefined) =>
    key && t.has(key) ? t(key) : key ? t('validation.totalInvalid') : null;

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <div className={styles.field}>
        <label htmlFor={ids.customer}>{t('form.customerName')}</label>
        <input
          id={ids.customer}
          autoComplete="off"
          placeholder={t('form.customerPlaceholder')}
          aria-invalid={errors.customerName ? true : undefined}
          aria-describedby={errors.customerName ? `${ids.customer}-error` : undefined}
          {...register('customerName')}
        />
        {errors.customerName ? (
          <span id={`${ids.customer}-error`} className={styles.error}>
            {message(errors.customerName.message)}
          </span>
        ) : null}
      </div>

      <div className={styles.field}>
        <label htmlFor={ids.status}>{t('form.status')}</label>
        {statusEditable ? (
          <select id={ids.status} {...register('status')}>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`status.${s}`)}
              </option>
            ))}
          </select>
        ) : (
          <>
            <input
              id={ids.status}
              readOnly
              value={t(`status.${getValues('status')}`)}
              aria-describedby={`${ids.status}-hint`}
            />
            <span id={`${ids.status}-hint`} className={styles.hint}>
              {t('form.statusReadOnly')}
            </span>
          </>
        )}
      </div>

      <div className={styles.field}>
        <label htmlFor={ids.total}>{t('form.total')}</label>
        <input
          id={ids.total}
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          aria-invalid={errors.total ? true : undefined}
          aria-describedby={errors.total ? `${ids.total}-error` : undefined}
          {...register('total', { valueAsNumber: true })}
        />
        {errors.total ? (
          <span id={`${ids.total}-error`} className={styles.error}>
            {message(errors.total.message)}
          </span>
        ) : null}
      </div>

      {error ? <ErrorState error={error} /> : null}

      <div>
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? t('form.saving') : t('form.submit')}
        </Button>
      </div>
    </form>
  );
}
