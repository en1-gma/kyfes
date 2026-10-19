<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useT } from '@/shared/i18n'
import { ACTION, useAbility } from '@/shared/rbac'
import { ForbiddenState, QueryState } from '@/shared/ui'
import { OrderForm, orderSubject, useOrder, type Order } from '@/features/orders'
import { ROUTES } from './route-names'

const props = defineProps<{ id: string }>()
const { t } = useT()
const router = useRouter()
const ability = useAbility()
const { data: order, isPending, error, refetch } = useOrder(() => props.id)

/** The route checks only the type (`update Order`); here the loaded record is checked (e.g. shipped orders). */
const canUpdate = computed(() => !!order.value && ability.can(ACTION.update, orderSubject(order.value)))

const toDetail = (saved?: Order) =>
  router.push({ name: ROUTES.orderDetail, params: { id: saved?.id ?? props.id } })
</script>

<template>
  <div class="page">
    <QueryState :pending="isPending" :error="error" @retry="refetch()">
      <template v-if="order">
        <template v-if="canUpdate">
          <h1>{{ t('orders.form.editTitle', { number: order.number }) }}</h1>
          <OrderForm :key="order.id" :order="order" @saved="toDetail" @cancel="toDetail()" />
        </template>
        <ForbiddenState v-else>
          <RouterLink :to="{ name: ROUTES.orderDetail, params: { id: order.id } }">
            {{ t('common.actions.back') }}
          </RouterLink>
        </ForbiddenState>
      </template>
    </QueryState>
  </div>
</template>
