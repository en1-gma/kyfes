<script setup lang="ts">
import { computed } from 'vue'
import { isApiError } from '@/shared/api'
import { formatCurrency, formatDate, useT } from '@/shared/i18n'
import { EmptyState, ErrorState, LoadingState } from '@/shared/ui'
import { useOrder } from '../api/orders.queries'

const props = defineProps<{ id: string }>()
const { t } = useT()
const { data: order, isPending, isError, error, refetch } = useOrder(() => props.id)
const notFound = computed(() => isApiError(error.value) && error.value.status === 404)
</script>

<template>
  <LoadingState v-if="isPending" />
  <EmptyState v-else-if="notFound" :message="t('orders.detail.notFound')" />
  <ErrorState v-else-if="isError" :error="error" retry @retry="refetch()" />
  <article v-else-if="order" class="order-detail">
    <h2>{{ t('orders.detail.title', { number: order.number }) }}</h2>
    <dl>
      <dt>{{ t('orders.fields.customerName') }}</dt>
      <dd>{{ order.customerName }}</dd>
      <dt>{{ t('orders.fields.status') }}</dt>
      <dd>{{ t(`orders.status.${order.status}`) }}</dd>
      <dt>{{ t('orders.fields.total') }}</dt>
      <dd>{{ formatCurrency(order.total) }}</dd>
      <dt>{{ t('orders.fields.createdAt') }}</dt>
      <dd>{{ formatDate(order.createdAt) }}</dd>
    </dl>
    <slot name="actions" :order="order" />
  </article>
</template>

<style scoped>
.order-detail dl {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: var(--space-1) var(--space-3);
}
.order-detail dt {
  font-weight: 600;
}
.order-detail dd {
  margin: 0;
}
</style>
