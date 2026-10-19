import {
  useMutation,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import type { Order, OrderPage, OrderWrite } from '../model/orders.schema';
import { ordersApi } from './orders.api';
import { orderKeys } from './orders.queries';

/** Lists and stats depend on every write. */
function invalidateOrderAggregates(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: orderKeys.lists() }),
    queryClient.invalidateQueries({ queryKey: orderKeys.stats() }),
  ]);
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: OrderWrite) => ordersApi.create(input),
    onSuccess: (order) => {
      queryClient.setQueryData(orderKeys.detail(order.id), order);
      return invalidateOrderAggregates(queryClient);
    },
  });
}

export function useUpdateOrder(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: OrderWrite) => ordersApi.update(id, input),
    onSuccess: (order) => {
      queryClient.setQueryData(orderKeys.detail(id), order);
      return invalidateOrderAggregates(queryClient);
    },
  });
}

type ListSnapshot = Array<[QueryKey, InfiniteData<OrderPage> | undefined]>;

/**
 * Optimistic delete: removes the row from every cached list. With concurrent deletes a failure
 * never restores a snapshot that may still contain another in-flight row: only the last one
 * settling refetches, and the snapshot is restored only when no other delete is pending.
 */
export function useDeleteOrder() {
  const queryClient = useQueryClient();
  const othersInFlight = () => queryClient.isMutating({ mutationKey: orderKeys.remove() }) > 1;
  return useMutation<void, Error, Order['id'], { previous: ListSnapshot }>({
    mutationKey: orderKeys.remove(),
    mutationFn: (id) => ordersApi.remove(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: orderKeys.lists() });
      const previous = queryClient.getQueriesData<InfiniteData<OrderPage>>({
        queryKey: orderKeys.lists(),
      });
      queryClient.setQueriesData<InfiniteData<OrderPage>>(
        { queryKey: orderKeys.lists() },
        (data) =>
          data
            ? {
                ...data,
                pages: data.pages.map((p) => ({ ...p, items: p.items.filter((o) => o.id !== id) })),
              }
            : data,
      );
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (othersInFlight()) {
        // Mark stale only: the last delete to settle refetches the real state.
        return queryClient.invalidateQueries({ queryKey: orderKeys.lists(), refetchType: 'none' });
      }
      context?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: orderKeys.detail(id) });
    },
    onSettled: () => {
      if (othersInFlight()) return;
      return invalidateOrderAggregates(queryClient);
    },
  });
}
