<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useT } from '@/shared/i18n'
import { useAbility } from '@/shared/rbac'
import { OrderDetail, orderSubject } from '@/features/orders'
import { ROUTES } from './route-names'

defineProps<{ id: string }>()
const { t } = useT()
const ability = useAbility()
</script>

<template>
  <div class="page">
    <RouterLink :to="{ name: ROUTES.orders }">{{ t('common.actions.back') }}</RouterLink>
    <OrderDetail :id="id">
      <template #actions="{ order }">
        <RouterLink
          v-if="ability.can('update', orderSubject(order))"
          class="button-link"
          :to="{ name: ROUTES.orderEdit, params: { id: order.id } }"
        >
          {{ t('orders.detail.edit') }}
        </RouterLink>
      </template>
    </OrderDetail>
  </div>
</template>
