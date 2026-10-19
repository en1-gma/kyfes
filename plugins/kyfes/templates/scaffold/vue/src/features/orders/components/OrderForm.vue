<script setup lang="ts">
import { useForm } from 'vee-validate'
import { computed, useId } from 'vue'
import { isApiError } from '@/shared/api'
import { useT } from '@/shared/i18n'
import { toTypedSchema } from '@/shared/lib'
import { useAbility } from '@/shared/rbac'
import { AppButton, ErrorState } from '@/shared/ui'
import { useCreateOrder, useUpdateOrder } from '../api/orders.mutations'
import { ORDER_STATUSES, OrderInputSchema, type Order, type OrderInput } from '../model/orders.schema'
import { ORDER_SUBJECT, orderSubject } from '../permissions'

const props = defineProps<{ order?: Order }>()
const emit = defineEmits<{ saved: [order: Order]; cancel: [] }>()

const { t } = useT()
const ability = useAbility()
const createOrder = useCreateOrder()
const updateOrder = useUpdateOrder()
const ids = { customerName: useId(), status: useId(), total: useId(), statusHint: useId() }

/** Field-level permission: without it the status is read-only (the server enforces it anyway). */
const statusReadOnly = computed(() =>
  props.order
    ? !ability.can('update', orderSubject(props.order), 'status')
    : !ability.can('create', ORDER_SUBJECT, 'status'),
)

const { defineField, handleSubmit, errors, setErrors, isSubmitting } = useForm({
  validationSchema: toTypedSchema(OrderInputSchema),
  initialValues: {
    customerName: props.order?.customerName ?? '',
    status: props.order?.status ?? 'draft',
    total: props.order?.total ?? 0,
  },
})
const [customerName, customerNameAttrs] = defineField('customerName')
const [status, statusAttrs] = defineField('status')
const [total, totalAttrs] = defineField('total')

const mutationError = computed(() => createOrder.error.value ?? updateOrder.error.value)
/** Field errors are shown next to the fields; anything else as a generic error. */
const showMutationError = computed(
  () => !!mutationError.value && !(isApiError(mutationError.value) && mutationError.value.fieldErrors),
)

const onSubmit = handleSubmit(async (values: OrderInput) => {
  try {
    const saved = props.order
      ? await updateOrder.mutateAsync({
          id: props.order.id,
          input: statusReadOnly.value ? { customerName: values.customerName, total: values.total } : values,
        })
      : await createOrder.mutateAsync(values)
    emit('saved', saved)
  } catch (error) {
    if (isApiError(error) && error.fieldErrors) {
      setErrors(Object.fromEntries(Object.entries(error.fieldErrors).map(([k, v]) => [k, v[0] ?? ''])))
    }
  }
})
</script>

<template>
  <form class="order-form" novalidate @submit="onSubmit">
    <div class="field">
      <label :for="ids.customerName">{{ t('orders.fields.customerName') }}</label>
      <input
        :id="ids.customerName"
        v-model="customerName"
        v-bind="customerNameAttrs"
        type="text"
        autocomplete="off"
        :aria-invalid="!!errors.customerName"
        :aria-describedby="errors.customerName ? `${ids.customerName}-error` : undefined"
      />
      <p v-if="errors.customerName" :id="`${ids.customerName}-error`" class="field__error">
        {{ t(errors.customerName) }}
      </p>
    </div>

    <div class="field">
      <label :for="ids.status">{{ t('orders.fields.status') }}</label>
      <select
        :id="ids.status"
        v-model="status"
        v-bind="statusAttrs"
        :disabled="statusReadOnly"
        :aria-describedby="statusReadOnly ? ids.statusHint : undefined"
      >
        <option v-for="s in ORDER_STATUSES" :key="s" :value="s">{{ t(`orders.status.${s}`) }}</option>
      </select>
      <p v-if="statusReadOnly" :id="ids.statusHint" class="field__hint">
        {{ t('orders.form.statusReadOnly') }}
      </p>
    </div>

    <div class="field">
      <label :for="ids.total">{{ t('orders.fields.total') }}</label>
      <input
        :id="ids.total"
        v-model.number="total"
        v-bind="totalAttrs"
        type="number"
        min="0"
        step="0.01"
        inputmode="decimal"
        :aria-invalid="!!errors.total"
        :aria-describedby="errors.total ? `${ids.total}-error` : undefined"
      />
      <p v-if="errors.total" :id="`${ids.total}-error`" class="field__error">{{ t(errors.total) }}</p>
    </div>

    <ErrorState v-if="showMutationError" :error="mutationError" />

    <div class="order-form__actions">
      <AppButton @click="emit('cancel')">{{ t('common.actions.cancel') }}</AppButton>
      <AppButton type="submit" variant="primary" :loading="isSubmitting">
        {{ t('common.actions.save') }}
      </AppButton>
    </div>
  </form>
</template>

<style scoped>
.order-form {
  display: grid;
  gap: var(--space-3);
  max-width: 32rem;
}
.field {
  display: grid;
  gap: var(--space-1);
}
.field__error {
  color: var(--color-danger);
  margin: 0;
}
.field__hint {
  color: var(--color-muted);
  font-size: var(--font-size-sm);
  margin: 0;
}
.order-form__actions {
  display: flex;
  gap: var(--space-2);
  justify-content: flex-end;
}
</style>
