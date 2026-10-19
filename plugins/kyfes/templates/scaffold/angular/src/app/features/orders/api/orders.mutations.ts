import { inject } from '@angular/core';
import { type InfiniteData, QueryClient, injectMutation } from '@tanstack/angular-query-experimental';
import type { Page } from '@shared/api';
import type { Order, OrderInput } from '../model/orders.schema';
import { OrdersApi } from './orders.api';
import { orderKeys } from './orders.queries';

type OrderPages = InfiniteData<Page<Order>, string | undefined>;

function invalidateListsAndStats(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: orderKeys.lists() }),
    queryClient.invalidateQueries({ queryKey: orderKeys.stats() }),
  ]);
}

export function injectCreateOrder() {
  const api = inject(OrdersApi);
  const queryClient = inject(QueryClient);
  return injectMutation(() => ({
    mutationFn: (input: OrderInput) => api.create(input),
    onSuccess: async (order: Order) => {
      queryClient.setQueryData(orderKeys.detail(order.id), order);
      await invalidateListsAndStats(queryClient);
    },
  }));
}

export function injectUpdateOrder() {
  const api = inject(OrdersApi);
  const queryClient = inject(QueryClient);
  return injectMutation(() => ({
    mutationFn: ({ id, input }: { id: string; input: OrderInput }) => api.update(id, input),
    onSuccess: async (order: Order) => {
      queryClient.setQueryData(orderKeys.detail(order.id), order);
      await invalidateListsAndStats(queryClient);
    },
  }));
}

/** Eliminazione con optimistic update sulle liste e rollback in caso di errore. */
export function injectDeleteOrder() {
  const api = inject(OrdersApi);
  const queryClient = inject(QueryClient);
  return injectMutation(() => ({
    mutationFn: (id: string) => api.remove(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: orderKeys.lists() });
      const previous = queryClient.getQueriesData<OrderPages>({ queryKey: orderKeys.lists() });
      queryClient.setQueriesData<OrderPages>({ queryKey: orderKeys.lists() }, (data) =>
        data
          ? { ...data, pages: data.pages.map((p) => ({ ...p, items: p.items.filter((o) => o.id !== id) })) }
          : data,
      );
      return { previous };
    },
    onError: (_error, _id, context) => {
      context?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: orderKeys.detail(id) });
    },
    onSettled: () => invalidateListsAndStats(queryClient),
  }));
}
