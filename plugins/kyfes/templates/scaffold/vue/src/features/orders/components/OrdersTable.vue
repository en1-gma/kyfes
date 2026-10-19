<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import { formatCurrency, formatDate, useT } from '@/shared/i18n'
import { useAbility } from '@/shared/rbac'
import { AppButton, ConfirmDialog, EmptyState, ErrorState, LoadingState } from '@/shared/ui'
import { useDeleteOrder } from '../api/orders.mutations'
import { useOrdersInfinite } from '../api/orders.queries'
import { ORDER_STATUSES, type Order } from '../model/orders.schema'
import { ORDER_SUBJECT, orderSubject } from '../permissions'
import { useOrdersUiStore } from '../stores/orders-ui.store'

const props = defineProps<{
  detailTo: (order: Order) => RouteLocationRaw
  editTo: (order: Order) => RouteLocationRaw
}>()

const { t } = useT()
const ability = useAbility()
const ui = useOrdersUiStore()
const { sort, status } = storeToRefs(ui)

const { orders, isPending, isError, error, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } =
  useOrdersInfinite(() => ({ sort: sort.value, status: status.value }))
const deleteOrder = useDeleteOrder()

/** The actions column exists only if the user may update or delete at least some order. */
const showActions = computed(
  () => ability.can('update', ORDER_SUBJECT) || ability.can('delete', ORDER_SUBJECT),
)
const canEdit = (order: Order) => ability.can('update', orderSubject(order))
const canDelete = (order: Order) => ability.can('delete', orderSubject(order))

const pendingDelete = ref<Order | null>(null)
function confirmDelete() {
  const order = pendingDelete.value
  pendingDelete.value = null
  if (order) deleteOrder.mutate(order.id)
}
</script>

<template>
  <section class="orders-table">
    <div class="orders-table__toolbar">
      <label>
        {{ t('orders.list.filterStatus') }}
        <select v-model="status">
          <option :value="undefined">{{ t('orders.list.allStatuses') }}</option>
          <option v-for="s in ORDER_STATUSES" :key="s" :value="s">{{ t(`orders.status.${s}`) }}</option>
        </select>
      </label>
    </div>

    <LoadingState v-if="isPending" />
    <ErrorState v-else-if="isError" :error="error" retry @retry="refetch()" />
    <EmptyState v-else-if="orders.length === 0" :message="t('orders.list.empty')" />
    <template v-else>
      <table>
        <caption>
          {{
            t('orders.list.caption')
          }}
          ({{
            t('orders.list.count', orders.length)
          }})
        </caption>
        <thead>
          <tr>
            <th scope="col">{{ t('orders.fields.number') }}</th>
            <th scope="col">{{ t('orders.fields.customerName') }}</th>
            <th scope="col">{{ t('orders.fields.status') }}</th>
            <th scope="col" class="num">{{ t('orders.fields.total') }}</th>
            <th scope="col" :aria-sort="sort === 'createdAt' ? 'ascending' : 'descending'">
              <AppButton variant="link" :aria-label="t('orders.list.sortByDate')" @click="ui.toggleSort()">
                {{ t('orders.fields.createdAt') }}
              </AppButton>
            </th>
            <th v-if="showActions" scope="col">{{ t('orders.list.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in orders" :key="order.id">
            <td>
              <RouterLink :to="props.detailTo(order)">{{ order.number }}</RouterLink>
            </td>
            <td>{{ order.customerName }}</td>
            <td>{{ t(`orders.status.${order.status}`) }}</td>
            <td class="num">{{ formatCurrency(order.total) }}</td>
            <td>{{ formatDate(order.createdAt) }}</td>
            <td v-if="showActions" class="actions">
              <RouterLink
                v-if="canEdit(order)"
                :to="props.editTo(order)"
                :aria-label="t('orders.list.editOrder', { number: order.number })"
              >
                {{ t('common.actions.edit') }}
              </RouterLink>
              <AppButton
                v-if="canDelete(order)"
                variant="danger"
                :aria-label="t('orders.list.deleteOrder', { number: order.number })"
                @click="pendingDelete = order"
              >
                {{ t('common.actions.delete') }}
              </AppButton>
            </td>
          </tr>
        </tbody>
      </table>
      <AppButton v-if="hasNextPage" :loading="isFetchingNextPage" @click="fetchNextPage()">
        {{ t('common.actions.loadMore') }}
      </AppButton>
    </template>
    <ErrorState v-if="deleteOrder.isError.value" :error="deleteOrder.error.value" />

    <ConfirmDialog
      :open="pendingDelete !== null"
      :title="t('orders.delete.title')"
      :message="t('orders.delete.message', { number: pendingDelete?.number ?? '' })"
      :confirm-label="t('orders.delete.confirm')"
      @confirm="confirmDelete"
      @cancel="pendingDelete = null"
    />
  </section>
</template>

<style scoped>
.orders-table table {
  width: 100%;
  border-collapse: collapse;
}
.orders-table caption {
  text-align: start;
  font-weight: 600;
  padding-block: var(--space-2);
}
.orders-table th,
.orders-table td {
  padding: var(--space-2);
  border-bottom: 1px solid var(--color-border);
  text-align: start;
}
.orders-table .num {
  text-align: end;
}
.orders-table .actions {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}
.orders-table__toolbar {
  margin-bottom: var(--space-3);
}
</style>
