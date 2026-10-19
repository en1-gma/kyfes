import { infiniteQueryOptions, queryOptions, useInfiniteQuery, useQuery } from '@tanstack/vue-query'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { DEFAULT_PAGE_SIZE } from '@/shared/api'
import { formatMonth } from '@/shared/i18n'
import type { OrderFilters } from '../model/orders.schema'
import { ordersApi } from './orders.api'
import { ORDERS_FEATURE } from '../constants'

export type OrderListParams = OrderFilters & { limit?: number }

/** Key factory: the only place where order query keys are written. */
export const orderKeys = {
  all: [ORDERS_FEATURE] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (params: OrderListParams) => [...orderKeys.lists(), params] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
  stats: () => [...orderKeys.all, 'stats'] as const,
  /** Mutation key shared by every delete (lets a failing delete know whether others are in flight). */
  removals: () => [...orderKeys.all, 'remove'] as const,
}

export function ordersInfiniteQueryOptions(params: OrderListParams = {}) {
  const limit = params.limit ?? DEFAULT_PAGE_SIZE
  return infiniteQueryOptions({
    queryKey: orderKeys.list({ ...params, limit }),
    queryFn: ({ pageParam, signal }) => ordersApi.list({ ...params, limit, cursor: pageParam }, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  })
}

export function orderQueryOptions(id: string) {
  return queryOptions({
    queryKey: orderKeys.detail(id),
    queryFn: ({ signal }) => ordersApi.get(id, signal),
  })
}

export function orderStatsQueryOptions() {
  return queryOptions({
    queryKey: orderKeys.stats(),
    queryFn: ({ signal }) => ordersApi.stats(signal),
    staleTime: 5 * 60_000,
  })
}

export function useOrdersInfinite(params: MaybeRefOrGetter<OrderListParams> = {}) {
  const query = useInfiniteQuery(computed(() => ordersInfiniteQueryOptions(toValue(params))))
  const orders = computed(() => query.data.value?.pages.flatMap((page) => page.items) ?? [])
  return { ...query, orders }
}

export function useOrder(id: MaybeRefOrGetter<string>) {
  return useQuery(computed(() => orderQueryOptions(toValue(id))))
}

/** Stats already shaped for shared/charts (month labels follow the active locale). */
export function useOrderStatsChart() {
  const query = useQuery(orderStatsQueryOptions())
  const chart = computed(() => {
    const months = query.data.value?.months ?? []
    return { categories: months.map((m) => formatMonth(m.month)), totals: months.map((m) => m.total) }
  })
  return { ...query, chart }
}
