import { useMutation, useQueryClient, type InfiniteData, type QueryClient } from '@tanstack/react-query';
import type { Order, OrderInput, OrderPage } from '../model/orders.schema';
import { ordersApi } from './orders.api';
import { orderKeys } from './orders.queries';

/** Lists and stats depend on every order: refetch them after any write. */
function invalidateAggregates(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: orderKeys.lists() }),
    queryClient.invalidateQueries({ queryKey: orderKeys.stats() }),
  ]);
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<OrderInput>) => ordersApi.create(input),
    onSuccess: async (order) => {
      queryClient.setQueryData(orderKeys.detail(order.id), order);
      await invalidateAggregates(queryClient);
    },
  });
}

export function useUpdateOrder(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<OrderInput>) => ordersApi.update(id, input),
    onSuccess: async (order) => {
      queryClient.setQueryData(orderKeys.detail(id), order);
      await invalidateAggregates(queryClient);
    },
  });
}

type OrderLists = InfiniteData<OrderPage, string | undefined>;

/** Shared by every delete: lets a failing delete know whether others are still in flight. */
const DELETE_ORDER_KEY = [...orderKeys.all, 'delete'] as const;

/** Delete with optimistic update on every cached list, rollback on error (kyfes §4.2). */
export function useDeleteOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: DELETE_ORDER_KEY,
    mutationFn: (order: Pick<Order, 'id'>) => ordersApi.remove(order.id),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: orderKeys.lists() });
      const previous = queryClient.getQueriesData<OrderLists>({ queryKey: orderKeys.lists() });
      queryClient.setQueriesData<OrderLists>({ queryKey: orderKeys.lists() }, (data) =>
        data
          ? {
              ...data,
              pages: data.pages.map((page) => ({ ...page, items: page.items.filter((o) => o.id !== id) })),
            }
          : data,
      );
      return { previous };
    },
    onError: async (_error, _order, context) => {
      // The snapshot also holds the rows of the other deletes still in flight: restoring it would bring
      // them back. Restore it only when this is the last pending delete, otherwise refetch later.
      if (queryClient.isMutating({ mutationKey: DELETE_ORDER_KEY }) <= 1) {
        for (const [key, data] of context?.previous ?? []) queryClient.setQueryData(key, data);
      } else {
        await queryClient.invalidateQueries({ queryKey: orderKeys.lists(), refetchType: 'none' });
      }
    },
    onSuccess: (_data, { id }) => {
      queryClient.removeQueries({ queryKey: orderKeys.detail(id) });
    },
    onSettled: async () => {
      // The last delete to finish refetches: earlier refetches would return rows still being deleted.
      if (queryClient.isMutating({ mutationKey: DELETE_ORDER_KEY }) <= 1)
        await invalidateAggregates(queryClient);
    },
  });
}
