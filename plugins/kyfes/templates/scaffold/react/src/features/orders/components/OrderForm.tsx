import { zodResolver } from '@hookform/resolvers/zod';
import { useId } from 'react';
import { useForm } from 'react-hook-form';
import { isApiError } from '@/shared/api';
import { ACTIONS, useCan } from '@/shared/rbac';
import { useTranslation } from '@/shared/i18n';
import { Button, ErrorState } from '@/shared/ui';
import { useCreateOrder, useUpdateOrder } from '../api/orders.mutations';
import { DEFAULT_ORDER_STATUS, ORDER_FIELDS, ORDER_SUBJECT, ORDERS_NS } from '../constants';
import { ORDER_STATUSES, OrderInputSchema, type Order, type OrderInput } from '../model/orders.schema';
import { ORDER_EDITABLE_FIELDS, orderSubject, type OrderEditableField } from '../permissions';

interface OrderFormProps {
  /** Edit mode when present, create mode otherwise. */
  order?: Order | undefined;
  onSaved?: ((order: Order) => void) | undefined;
  onCancel?: (() => void) | undefined;
}

export function OrderForm({ order, onSaved, onCancel }: OrderFormProps) {
  const { t } = useTranslation(ORDERS_NS);
  const can = useCan();
  const formId = useId();
  const create = useCreateOrder();
  const update = useUpdateOrder(order?.id ?? '');
  const mutation = order ? update : create;

  // Field-level permission (kyfes §5): a field the rules do not allow is read-only and never sent.
  const writable = (field: OrderEditableField) =>
    order ? can(ACTIONS.update, orderSubject(order), field) : can(ACTIONS.create, ORDER_SUBJECT, field);
  const statusReadOnly = !writable(ORDER_FIELDS.status);

  const {
    register,
    handleSubmit,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<OrderInput>({
    resolver: zodResolver(OrderInputSchema),
    defaultValues: order
      ? { customerName: order.customerName, status: order.status, total: order.total }
      : { customerName: '', status: DEFAULT_ORDER_STATUS, total: 0 },
  });

  const onSubmit = handleSubmit(async (values) => {
    const payload: Partial<OrderInput> = Object.fromEntries(
      ORDER_EDITABLE_FIELDS.filter(writable).map((field) => [field, values[field]]),
    );
    try {
      const saved = order ? await update.mutateAsync(payload) : await create.mutateAsync(payload);
      onSaved?.(saved);
    } catch (error) {
      // Server-side validation errors land on their fields; everything else is shown below.
      if (isApiError(error) && error.fieldErrors) {
        for (const field of ORDER_EDITABLE_FIELDS) {
          const message = error.fieldErrors[field]?.[0];
          if (message) setError(field, { type: 'server', message });
        }
      }
    }
  });

  const errorText = (message: string | undefined) =>
    message ? t(`common:${message}`, { defaultValue: message }) : '';

  return (
    <form className="form" noValidate aria-labelledby={`${formId}-title`} onSubmit={(e) => void onSubmit(e)}>
      <h2 id={`${formId}-title`}>
        {order ? t('form.titleEdit', { number: order.number }) : t('form.titleNew')}
      </h2>

      <div className="field">
        <label htmlFor={`${formId}-customer`}>{t('form.customerName')}</label>
        <input
          id={`${formId}-customer`}
          autoComplete="organization"
          aria-invalid={errors.customerName ? true : undefined}
          aria-describedby={errors.customerName ? `${formId}-customer-error` : undefined}
          {...register(ORDER_FIELDS.customerName)}
        />
        {errors.customerName && (
          <p id={`${formId}-customer-error`} className="field__error">
            {errorText(errors.customerName.message)}
          </p>
        )}
      </div>

      <div className="field">
        <label htmlFor={`${formId}-status`}>{t('form.status')}</label>
        {statusReadOnly ? (
          // Not registered: the value stays the one loaded and is not sent to the server.
          <input
            id={`${formId}-status`}
            readOnly
            value={t(`status.${getValues(ORDER_FIELDS.status)}`)}
            aria-describedby={`${formId}-status-hint`}
          />
        ) : (
          <select id={`${formId}-status`} {...register(ORDER_FIELDS.status)}>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`status.${s}`)}
              </option>
            ))}
          </select>
        )}
        {statusReadOnly && (
          <p id={`${formId}-status-hint`} className="field__hint">
            {t('form.statusReadOnly')}
          </p>
        )}
      </div>

      <div className="field">
        <label htmlFor={`${formId}-total`}>{t('form.total')}</label>
        <input
          id={`${formId}-total`}
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          aria-invalid={errors.total ? true : undefined}
          aria-describedby={errors.total ? `${formId}-total-error` : undefined}
          {...register(ORDER_FIELDS.total, { valueAsNumber: true })}
        />
        {errors.total && (
          <p id={`${formId}-total-error`} className="field__error">
            {errorText(errors.total.message)}
          </p>
        )}
      </div>

      {mutation.isError && !(isApiError(mutation.error) && mutation.error.fieldErrors) && (
        <ErrorState error={mutation.error} />
      )}

      <div className="form__actions">
        {onCancel && <Button onClick={onCancel}>{t('common:actions.cancel')}</Button>}
        <Button type="submit" variant="primary" busy={isSubmitting}>
          {t('common:actions.save')}
        </Button>
      </div>
    </form>
  );
}
