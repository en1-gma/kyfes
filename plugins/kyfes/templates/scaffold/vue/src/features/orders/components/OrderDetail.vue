<script setup lang="ts">
import { computed } from 'vue'
import { isApiError } from '@/shared/api'
import { formatCurrency, formatDate, useT } from '@/shared/i18n'
import { QueryState } from '@/shared/ui'
import { useOrder } from '../api/orders.queries'

const props = defineProps<{ id: string }>()
const { t } = useT()
const { data: order, isPending, error, refetch } = useOrder(() => props.id)
const notFound = computed(() => isApiError(error.value) && error.value.status === 404)
</script>

<template>
  <!-- 404 is shown as "not found" (empty state), every other error with retry. -->
  <QueryState
    :pending="isPending"
    :error="notFound ? null : error"
    :empty="notFound"
    :empty-message="t('orders.detail.notFound')"
    @retry="refetch()"
  >
    <article v-if="order" class="order-detail">
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
  </QueryState>
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
