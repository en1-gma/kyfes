<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useT } from '@/shared/i18n'
import { ACTION, useAbility } from '@/shared/rbac'
import { ORDER_SUBJECT, OrdersChart, OrdersTable, type Order } from '@/features/orders'
import { ROUTES } from './route-names'

const { t } = useT()
const ability = useAbility()
const detailTo = (order: Order) => ({ name: ROUTES.orderDetail, params: { id: order.id } })
const editTo = (order: Order) => ({ name: ROUTES.orderEdit, params: { id: order.id } })
</script>

<template>
  <div class="page">
    <div class="page__header">
      <h1>{{ t('orders.title') }}</h1>
      <RouterLink
        v-if="ability.can(ACTION.create, ORDER_SUBJECT)"
        class="button-link"
        :to="{ name: ROUTES.orderNew }"
      >
        {{ t('orders.list.new') }}
      </RouterLink>
    </div>
    <OrdersChart />
    <OrdersTable :detail-to="detailTo" :edit-to="editTo" />
  </div>
</template>
