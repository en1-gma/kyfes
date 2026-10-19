import { inject } from '@angular/core';
import { type InfiniteData, QueryClient, injectMutation } from '@tanstack/angular-query-experimental';
import type { Page } from '@shared/api';
import type { Order, OrderPatch } from '../model/orders.schema';
import { OrdersApi } from './orders.api';
import { orderKeys } from './orders.queries';

type OrderPages = InfiniteData<Page<Order>, string | undefined>;

/** Chiave delle delete: serve a contare quelle in volo (`isMutating`). */
export const DELETE_ORDER_MUTATION_KEY = orderKeys.removals();

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
    mutationFn: (input: OrderPatch) => api.create(input),
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
    mutationFn: ({ id, input }: { id: string; input: OrderPatch }) => api.update(id, input),
    onSuccess: async (order: Order) => {
      queryClient.setQueryData(orderKeys.detail(order.id), order);
      await invalidateListsAndStats(queryClient);
    },
  }));
}

/**
 * Eliminazione con optimistic update sulle liste. Con più delete concorrenti lo snapshot di una
 * contiene ancora le righe delle altre: in caso di errore lo si ripristina solo se è l'unica in volo,
 * altrimenti le liste vengono solo segnate da ricaricare (lo farà l'ultima che termina).
 * La cache del dettaglio si rimuove solo se il server conferma.
 */
export function injectDeleteOrder() {
  const api = inject(OrdersApi);
  const queryClient = inject(QueryClient);
  const onlyDeleteInFlight = () => queryClient.isMutating({ mutationKey: DELETE_ORDER_MUTATION_KEY }) <= 1;
  return injectMutation(() => ({
    mutationKey: DELETE_ORDER_MUTATION_KEY,
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
    onError: async (_error, _id, context) => {
      if (onlyDeleteInFlight()) {
        context?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data));
      } else {
        await queryClient.invalidateQueries({ queryKey: orderKeys.lists(), refetchType: 'none' });
      }
    },
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: orderKeys.detail(id) });
    },
    onSettled: async () => {
      if (onlyDeleteInFlight()) await invalidateListsAndStats(queryClient);
    },
  }));
}
