<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useT } from '@/shared/i18n'
import { ErrorState, LoadingState } from '@/shared/ui'
import { OrderForm, useOrder, type Order } from '@/features/orders'
import { ROUTES } from './route-names'

const props = defineProps<{ id: string }>()
const { t } = useT()
const router = useRouter()
const { data: order, isPending, isError, error } = useOrder(() => props.id)

const toDetail = (saved?: Order) =>
  router.push({ name: ROUTES.orderDetail, params: { id: saved?.id ?? props.id } })
</script>

<template>
  <div class="page">
    <LoadingState v-if="isPending" />
    <ErrorState v-else-if="isError" :error="error" />
    <template v-else-if="order">
      <h1>{{ t('orders.form.editTitle', { number: order.number }) }}</h1>
      <OrderForm :key="order.id" :order="order" @saved="toDetail" @cancel="toDetail()" />
    </template>
  </div>
</template>
