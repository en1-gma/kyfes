'use client';

import { useEffect, useId, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { isApiError } from '@/shared/api';
import { useTranslations } from '@/shared/i18n';
import { useAbility } from '@/shared/rbac';
import { BUTTON_VARIANT, Button, ErrorState } from '@/shared/ui';
import { ORDERS_NS } from '../locales/namespace';
import {
  DEFAULT_ORDER_STATUS,
  ORDER_FIELD,
  ORDER_FIELDS,
  ORDER_STATUSES,
  OrderInputSchema,
  type Order,
  type OrderInput,
  type OrderWrite,
} from '../model/orders.schema';
import { pickWritable, writableOrderFields } from '../permissions';
import styles from './orders.module.css';

export interface OrderFormProps {
  order?: Order;
  /** Receives only the fields the user may write (field-level permissions). */
  onSubmit: (input: OrderWrite) => void;
  isSubmitting?: boolean;
  error?: unknown;
}

/** Create/edit form validated with Zod; fields without write permission are read-only and never sent. */
export function OrderForm({ order, onSubmit, isSubmitting = false, error }: OrderFormProps) {
  const t = useTranslations(ORDERS_NS);
  const ability = useAbility();
  const ids = { customer: useId(), status: useId(), total: useId() };
  const writable = useMemo(() => writableOrderFields(ability, order), [ability, order]);

  const {
    register,
    handleSubmit,
    getValues,
    setError,
    formState: { errors },
  } = useForm<OrderInput>({
    resolver: zodResolver(OrderInputSchema),
    defaultValues: {
      customerName: order?.customerName ?? '',
      status: order?.status ?? DEFAULT_ORDER_STATUS,
      total: order?.total ?? 0,
    },
  });

  // Server-side validation (422 fieldErrors) lands on its fields.
  const fieldErrors = isApiError(error) ? error.fieldErrors : undefined;
  const onFields = ORDER_FIELDS.some((field) => (fieldErrors?.[field]?.length ?? 0) > 0);
  useEffect(() => {
    if (!fieldErrors) return;
    for (const field of ORDER_FIELDS) {
      const message = fieldErrors[field]?.[0];
      if (message) setError(field, { type: 'server', message });
    }
  }, [fieldErrors, setError]);

  const submit = handleSubmit((values) => onSubmit(pickWritable(values, writable)));

  // Zod messages are keys of the `orders` namespace; anything else (e.g. a server message)
  // gets a generic, translated text: raw backend strings are never shown.
  const message = (key: string | undefined) =>
    key ? (t.has(key) ? t(key) : t('validation.invalid')) : null;

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <div className={styles.field}>
        <label htmlFor={ids.customer}>{t('form.customerName')}</label>
        <input
          id={ids.customer}
          autoComplete="off"
          placeholder={t('form.customerPlaceholder')}
          readOnly={!writable.has(ORDER_FIELD.customerName)}
          aria-invalid={errors.customerName ? true : undefined}
          aria-describedby={errors.customerName ? `${ids.customer}-error` : undefined}
          {...register(ORDER_FIELD.customerName)}
        />
        {errors.customerName ? (
          <span id={`${ids.customer}-error`} className={styles.error}>
            {message(errors.customerName.message)}
          </span>
        ) : null}
      </div>

      <div className={styles.field}>
        <label htmlFor={ids.status}>{t('form.status')}</label>
        {writable.has(ORDER_FIELD.status) ? (
          <select
            id={ids.status}
            aria-invalid={errors.status ? true : undefined}
            aria-describedby={errors.status ? `${ids.status}-error` : undefined}
            {...register(ORDER_FIELD.status)}
          >
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
              value={t(`status.${getValues(ORDER_FIELD.status)}`)}
              aria-describedby={`${ids.status}-hint`}
            />
            <span id={`${ids.status}-hint`} className={styles.hint}>
              {t('form.statusReadOnly')}
            </span>
          </>
        )}
        {errors.status ? (
          <span id={`${ids.status}-error`} className={styles.error}>
            {message(errors.status.message)}
          </span>
        ) : null}
      </div>

      <div className={styles.field}>
        <label htmlFor={ids.total}>{t('form.total')}</label>
        <input
          id={ids.total}
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          readOnly={!writable.has(ORDER_FIELD.total)}
          aria-invalid={errors.total ? true : undefined}
          aria-describedby={errors.total ? `${ids.total}-error` : undefined}
          {...register(ORDER_FIELD.total, { valueAsNumber: true })}
        />
        {errors.total ? (
          <span id={`${ids.total}-error`} className={styles.error}>
            {message(errors.total.message)}
          </span>
        ) : null}
      </div>

      {error && !onFields ? <ErrorState error={error} /> : null}

      <div>
        <Button type="submit" variant={BUTTON_VARIANT.primary} disabled={isSubmitting}>
          {isSubmitting ? t('form.saving') : t('form.submit')}
        </Button>
      </div>
    </form>
  );
}
