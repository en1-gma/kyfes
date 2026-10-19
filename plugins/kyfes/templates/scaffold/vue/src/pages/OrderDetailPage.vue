<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useT } from '@/shared/i18n'
import { ACTION, useAbility } from '@/shared/rbac'
import { ORDER_ROUTE, OrderDetail, orderSubject } from '@/features/orders'

defineProps<{ id: string }>()
const { t } = useT()
const ability = useAbility()
</script>

<template>
  <div class="page">
    <RouterLink :to="{ name: ORDER_ROUTE.list }">{{ t('common.actions.back') }}</RouterLink>
    <OrderDetail :id="id">
      <template #actions="{ order }">
        <RouterLink
          v-if="ability.can(ACTION.update, orderSubject(order))"
          class="button-link"
          :to="{ name: ORDER_ROUTE.edit, params: { id: order.id } }"
        >
          {{ t('orders.detail.edit') }}
        </RouterLink>
      </template>
    </OrderDetail>
  </div>
</template>
