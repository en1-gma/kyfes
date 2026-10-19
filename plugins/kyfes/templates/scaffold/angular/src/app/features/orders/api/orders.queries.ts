import { inject } from '@angular/core';
import {
  infiniteQueryOptions,
  injectInfiniteQuery,
  injectQuery,
  queryOptions,
} from '@tanstack/angular-query-experimental';
import { DEFAULT_PAGE_SIZE } from '@shared/api';
import type { OrderListFilters, OrderStats } from '../model/orders.schema';
import { OrdersApi } from './orders.api';

export const DEFAULT_ORDER_FILTERS: OrderListFilters = { limit: DEFAULT_PAGE_SIZE, sort: '-createdAt' };

/** Factory delle chiavi: mai chiavi scritte a mano nei componenti. */
export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (filters: OrderListFilters) => [...orderKeys.lists(), filters] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
  stats: () => [...orderKeys.all, 'stats'] as const,
};

export function ordersInfiniteQueryOptions(
  api: OrdersApi,
  filters: OrderListFilters = DEFAULT_ORDER_FILTERS,
) {
  return infiniteQueryOptions({
    queryKey: orderKeys.list(filters),
    queryFn: ({ pageParam }) => api.list({ ...filters, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function orderQueryOptions(api: OrdersApi, id: string) {
  return queryOptions({
    queryKey: orderKeys.detail(id),
    queryFn: () => api.get(id),
  });
}

export interface MonthlyTotals {
  categories: string[];
  values: number[];
}

/** Trasformazione per il grafico fatta qui, non nel componente. */
export function toMonthlyTotals(stats: OrderStats): MonthlyTotals {
  return {
    categories: stats.months.map((m) => m.month),
    values: stats.months.map((m) => m.total),
  };
}

export function orderStatsQueryOptions(api: OrdersApi) {
  return queryOptions({
    queryKey: orderKeys.stats(),
    queryFn: () => api.stats(),
    select: toMonthlyTotals,
  });
}

/** Lista infinita (signal) — da chiamare in un contesto di iniezione. */
export function injectOrdersList(filters: () => OrderListFilters = () => DEFAULT_ORDER_FILTERS) {
  const api = inject(OrdersApi);
  return injectInfiniteQuery(() => ordersInfiniteQueryOptions(api, filters()));
}

/** Dettaglio; disabilitato finché l'id non è disponibile. */
export function injectOrder(id: () => string | undefined) {
  const api = inject(OrdersApi);
  return injectQuery(() => {
    const value = id();
    return { ...orderQueryOptions(api, value ?? ''), enabled: !!value };
  });
}

export function injectOrderStats() {
  const api = inject(OrdersApi);
  return injectQuery(() => orderStatsQueryOptions(api));
}
