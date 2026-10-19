import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { OrderFilters, OrderStatus } from '../model/orders.schema'

/** UI-only state (filters, sort). Server data lives in TanStack Query, never here. */
export const useOrdersUiStore = defineStore('orders-ui', () => {
  const sort = ref<NonNullable<OrderFilters['sort']>>('-createdAt')
  const status = ref<OrderStatus | undefined>(undefined)

  function toggleSort() {
    sort.value = sort.value === '-createdAt' ? 'createdAt' : '-createdAt'
  }

  return { sort, status, toggleSort }
})
