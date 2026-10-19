import { defineStore } from 'pinia'
import { ref } from 'vue'
import { DEFAULT_ORDER_SORT, ORDER_SORT, type OrderSort, type OrderStatus } from '../model/orders.schema'

/** UI-only state (filters, sort). Server data lives in TanStack Query, never here. */
export const useOrdersUiStore = defineStore('orders-ui', () => {
  const sort = ref<OrderSort>(DEFAULT_ORDER_SORT)
  const status = ref<OrderStatus | undefined>(undefined)

  function toggleSort() {
    sort.value = sort.value === ORDER_SORT.createdAtDesc ? ORDER_SORT.createdAtAsc : ORDER_SORT.createdAtDesc
  }

  return { sort, status, toggleSort }
})
