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
    mutationFn: (input: OrderInput) => ordersApi.create(input),
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

/** Delete with optimistic update on every cached list, rollback on error (kyfes §4.2). */
export function useDeleteOrder() {
  const queryClient = useQueryClient();
  return useMutation({
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
    onError: (_error, _order, context) => {
      for (const [key, data] of context?.previous ?? []) queryClient.setQueryData(key, data);
    },
    onSettled: async (_data, _error, { id }) => {
      queryClient.removeQueries({ queryKey: orderKeys.detail(id) });
      await invalidateAggregates(queryClient);
    },
  });
}
