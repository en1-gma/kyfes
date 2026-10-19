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
    mutationFn: (input: Partial<OrderInput>) => ordersApi.create(input),
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

/** Shared by every delete: lets a failing delete know whether others are still in flight. */
export const deleteOrderMutationKey = [...orderKeys.all, 'delete'] as const

/**
 * Optimistic delete: the row disappears at once. On error the snapshot is restored only if no other
 * delete is in flight (it would bring their rows back); otherwise the lists are just invalidated and
 * the last delete to settle refetches them. The detail cache is dropped only on success.
 */
export function useDeleteOrder() {
  const queryClient = useQueryClient()
  const othersInFlight = () => queryClient.isMutating({ mutationKey: deleteOrderMutationKey }) > 1
  return useMutation({
    mutationKey: deleteOrderMutationKey,
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
    onError: async (_error, _id, context) => {
      if (othersInFlight()) {
        // Mark stale without refetching now: the server still has the other pending rows.
        await queryClient.invalidateQueries({ queryKey: orderKeys.lists(), refetchType: 'none' })
        return
      }
      context?.snapshot.forEach(([key, data]) => queryClient.setQueryData(key, data))
    },
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: orderKeys.detail(id) })
    },
    onSettled: async () => {
      if (othersInFlight()) return
      await invalidateOrderLists(queryClient)
    },
  })
}
