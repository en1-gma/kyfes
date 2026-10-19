<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import { formatCurrency, formatDate, useT } from '@/shared/i18n'
import { ACTION, useAbility } from '@/shared/rbac'
import { AppButton, ConfirmDeleteDialog, ErrorState, LoadMore, QueryState } from '@/shared/ui'
import { useDeleteOrder } from '../api/orders.mutations'
import { useOrdersInfinite } from '../api/orders.queries'
import { ORDER_SORT, ORDER_STATUSES, type Order } from '../model/orders.schema'
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

const { orders, isPending, error, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } =
  useOrdersInfinite(() => ({ sort: sort.value, status: status.value }))
const deleteOrder = useDeleteOrder()

/** The actions column exists only if the user may update or delete at least some order. */
const showActions = computed(
  () => ability.can(ACTION.update, ORDER_SUBJECT) || ability.can(ACTION.delete, ORDER_SUBJECT),
)
const canEdit = (order: Order) => ability.can(ACTION.update, orderSubject(order))
const canDelete = (order: Order) => ability.can(ACTION.delete, orderSubject(order))

const pendingDelete = ref<Order | null>(null)
const deleteLabels = computed(() => ({
  title: t('orders.delete.title'),
  message: t('orders.delete.message', { number: pendingDelete.value?.number ?? '' }),
  confirm: t('orders.delete.confirm'),
}))
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

    <QueryState
      :pending="isPending"
      :error="error"
      :empty="orders.length === 0"
      :empty-message="t('orders.list.empty')"
      @retry="refetch()"
    >
      <table>
        <caption>
          {{
            t('orders.list.caption')
          }}
        </caption>
        <thead>
          <tr>
            <th scope="col">{{ t('orders.fields.number') }}</th>
            <th scope="col">{{ t('orders.fields.customerName') }}</th>
            <th scope="col">{{ t('orders.fields.status') }}</th>
            <th scope="col" class="num">{{ t('orders.fields.total') }}</th>
            <th scope="col" :aria-sort="sort === ORDER_SORT.createdAtAsc ? 'ascending' : 'descending'">
              <!-- The accessible name starts with the visible text (WCAG 2.5.3 label in name). -->
              <AppButton
                variant="link"
                :aria-label="t('orders.list.sortByDate', { label: t('orders.fields.createdAt') })"
                @click="ui.toggleSort()"
              >
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
      <LoadMore
        :summary="t('orders.list.count', orders.length)"
        :has-next-page="hasNextPage"
        :loading="isFetchingNextPage"
        @more="fetchNextPage()"
      />
    </QueryState>
    <ErrorState v-if="deleteOrder.isError.value" :error="deleteOrder.error.value" />

    <ConfirmDeleteDialog
      :item="pendingDelete"
      :labels="deleteLabels"
      @confirm="(order) => deleteOrder.mutate(order.id)"
      @close="pendingDelete = null"
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
