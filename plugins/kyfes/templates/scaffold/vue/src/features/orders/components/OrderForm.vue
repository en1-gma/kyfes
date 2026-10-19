<script setup lang="ts">
import { useForm } from 'vee-validate'
import { computed, useId } from 'vue'
import { isApiError } from '@/shared/api'
import { useT } from '@/shared/i18n'
import { toTypedSchema } from '@/shared/lib'
import { ACTION, useAbility } from '@/shared/rbac'
import { AppButton, ErrorState } from '@/shared/ui'
import { useCreateOrder, useUpdateOrder } from '../api/orders.mutations'
import { DEFAULT_ORDER_STATUS, ORDER_FIELD, ORDER_FIELDS, ORDER_SUBJECT, type OrderField } from '../constants'
import { ORDER_STATUSES, OrderInputSchema, type Order, type OrderInput } from '../model/orders.schema'
import { orderSubject } from '../permissions'

const props = defineProps<{ order?: Order }>()
const emit = defineEmits<{ saved: [order: Order]; cancel: [] }>()

const { t, te } = useT()
const ability = useAbility()
const createOrder = useCreateOrder()
const updateOrder = useUpdateOrder()
const ids = {
  customerName: useId(),
  status: useId(),
  total: useId(),
  statusHint: useId(),
  readOnlyHint: useId(),
}

/** Field-level permission: a field the user cannot write is read-only and never sent (the server enforces it anyway). */
const writable = computed(() => {
  const order = props.order
  const can = (field: OrderField) =>
    order
      ? ability.can(ACTION.update, orderSubject(order), field)
      : ability.can(ACTION.create, ORDER_SUBJECT, field)
  return new Set(ORDER_FIELDS.filter(can))
})
const readOnly = (field: OrderField) => !writable.value.has(field)
const statusReadOnly = computed(() => readOnly(ORDER_FIELD.status))

/** Payload with only the writable fields (create and PATCH alike). */
function writablePayload(values: OrderInput): Partial<OrderInput> {
  return Object.fromEntries(Object.entries(values).filter(([k]) => writable.value.has(k as OrderField)))
}

const { defineField, handleSubmit, errors, setErrors, isSubmitting } = useForm({
  validationSchema: toTypedSchema(OrderInputSchema),
  initialValues: {
    customerName: props.order?.customerName ?? '',
    status: props.order?.status ?? DEFAULT_ORDER_STATUS,
    total: props.order?.total ?? 0,
  },
})
const [customerName, customerNameAttrs] = defineField(ORDER_FIELD.customerName)
const [status, statusAttrs] = defineField(ORDER_FIELD.status)
const [total, totalAttrs] = defineField(ORDER_FIELD.total)

const isFormField = (key: string): key is OrderField => (ORDER_FIELDS as readonly string[]).includes(key)

/** Client messages are i18n keys; server messages are already text: never use them as keys. */
const message = (text: string) => (te(text) ? t(text) : text)

const mutationError = computed(() => createOrder.error.value ?? updateOrder.error.value)
/** Field errors are shown next to the fields; anything else (or errors on unknown fields) as a generic error. */
const showMutationError = computed(() => {
  const error = mutationError.value
  if (!error) return false
  if (!isApiError(error) || !error.fieldErrors) return true
  const keys = Object.keys(error.fieldErrors)
  return keys.length === 0 || !keys.every(isFormField)
})

const onSubmit = handleSubmit(async (values: OrderInput) => {
  try {
    const input = writablePayload(values)
    const saved = props.order
      ? await updateOrder.mutateAsync({ id: props.order.id, input })
      : await createOrder.mutateAsync(input)
    emit('saved', saved)
  } catch (error) {
    if (isApiError(error) && error.fieldErrors) {
      const known = Object.entries(error.fieldErrors).filter(([k]) => isFormField(k))
      setErrors(Object.fromEntries(known.map(([k, v]) => [k, v[0] ?? ''])))
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
        :readonly="readOnly(ORDER_FIELD.customerName)"
        :aria-invalid="!!errors.customerName"
        :aria-describedby="
          errors.customerName
            ? `${ids.customerName}-error`
            : readOnly(ORDER_FIELD.customerName)
              ? ids.readOnlyHint
              : undefined
        "
      />
      <p v-if="errors.customerName" :id="`${ids.customerName}-error`" class="field__error">
        {{ message(errors.customerName) }}
      </p>
    </div>

    <div class="field">
      <label :for="ids.status">{{ t('orders.fields.status') }}</label>
      <select
        :id="ids.status"
        v-model="status"
        v-bind="statusAttrs"
        :disabled="statusReadOnly"
        :aria-invalid="!!errors.status"
        :aria-describedby="
          errors.status ? `${ids.status}-error` : statusReadOnly ? ids.statusHint : undefined
        "
      >
        <option v-for="s in ORDER_STATUSES" :key="s" :value="s">{{ t(`orders.status.${s}`) }}</option>
      </select>
      <p v-if="errors.status" :id="`${ids.status}-error`" class="field__error">
        {{ message(errors.status) }}
      </p>
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
        :readonly="readOnly(ORDER_FIELD.total)"
        :aria-invalid="!!errors.total"
        :aria-describedby="
          errors.total ? `${ids.total}-error` : readOnly(ORDER_FIELD.total) ? ids.readOnlyHint : undefined
        "
      />
      <p v-if="errors.total" :id="`${ids.total}-error`" class="field__error">{{ message(errors.total) }}</p>
    </div>

    <p
      v-if="readOnly(ORDER_FIELD.customerName) || readOnly(ORDER_FIELD.total)"
      :id="ids.readOnlyHint"
      class="field__hint"
    >
      {{ t('orders.form.fieldReadOnly') }}
    </p>

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
