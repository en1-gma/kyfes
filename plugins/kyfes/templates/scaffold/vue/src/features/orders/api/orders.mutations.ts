import { useMutation, useQueryClient, type InfiniteData, type QueryClient } from '@tanstack/vue-query'
import type { Page } from '@/shared/api'
import type { Order, OrderInput } from '../model/orders.schema'
import { ordersApi } from './orders.api'
import { orderKeys } from './orders.queries'

/** Lists and stats depend on every write. */
function invalidateOrderLists(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: orderKeys.lists() }),
    queryClient.invalidateQueries({ queryKey: orderKeys.stats() }),
  ])
}

export function useCreateOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: OrderInput) => ordersApi.create(input),
    onSuccess: async (order) => {
      queryClient.setQueryData(orderKeys.detail(order.id), order)
      await invalidateOrderLists(queryClient)
    },
  })
}

export function useUpdateOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<OrderInput> }) => ordersApi.update(id, input),
    onSuccess: async (order) => {
      queryClient.setQueryData(orderKeys.detail(order.id), order)
      await invalidateOrderLists(queryClient)
    },
  })
}

type OrdersPages = InfiniteData<Page<Order>, string | undefined>

/** Optimistic delete: the row disappears at once, the lists are restored on error. */
export function useDeleteOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => ordersApi.remove(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: orderKeys.lists() })
      const snapshot = queryClient.getQueriesData<OrdersPages>({ queryKey: orderKeys.lists() })
      queryClient.setQueriesData<OrdersPages>({ queryKey: orderKeys.lists() }, (data) =>
        data
          ? { ...data, pages: data.pages.map((p) => ({ ...p, items: p.items.filter((o) => o.id !== id) })) }
          : data,
      )
      return { snapshot }
    },
    onError: (_error, _id, context) => {
      context?.snapshot.forEach(([key, data]) => queryClient.setQueryData(key, data))
    },
    onSettled: async (_data, _error, id) => {
      queryClient.removeQueries({ queryKey: orderKeys.detail(id) })
      await invalidateOrderLists(queryClient)
    },
  })
}
