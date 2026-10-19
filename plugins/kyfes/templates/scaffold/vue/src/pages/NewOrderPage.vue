<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useT } from '@/shared/i18n'
import { OrderForm, type Order } from '@/features/orders'
import { ROUTES } from './route-names'

const { t } = useT()
const router = useRouter()
const onSaved = (order: Order) => router.push({ name: ROUTES.orderDetail, params: { id: order.id } })
const onCancel = () => router.push({ name: ROUTES.orders })
</script>

<template>
  <div class="page">
    <h1>{{ t('orders.form.newTitle') }}</h1>
    <OrderForm @saved="onSaved" @cancel="onCancel" />
  </div>
</template>
