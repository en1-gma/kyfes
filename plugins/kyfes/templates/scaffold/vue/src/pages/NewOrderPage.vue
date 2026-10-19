<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useT } from '@/shared/i18n'
import { ORDER_ROUTE, OrderForm, type Order } from '@/features/orders'

const { t } = useT()
const router = useRouter()
const onSaved = (order: Order) => router.push({ name: ORDER_ROUTE.detail, params: { id: order.id } })
const onCancel = () => router.push({ name: ORDER_ROUTE.list })
</script>

<template>
  <div class="page">
    <h1>{{ t('orders.form.newTitle') }}</h1>
    <OrderForm @saved="onSaved" @cancel="onCancel" />
  </div>
</template>
