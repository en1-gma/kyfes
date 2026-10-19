import { infiniteQueryOptions, queryOptions, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { DEFAULT_PAGE_SIZE, getNextCursor } from '@/shared/api';
import { DEFAULT_ORDER_SORT, ORDERS_FEATURE } from '../constants';
import type { OrderListFilters } from '../model/orders.schema';
import { ordersApi } from './orders.api';

/** Key factory: the only place where the keys of the feature are written (kyfes §4.2). */
export const orderKeys = {
  all: [ORDERS_FEATURE] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (filters: OrderListFilters) => [...orderKeys.lists(), filters] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
  stats: () => [...orderKeys.all, 'stats'] as const,
  /** Mutation key shared by every delete (`ordersApi.remove`). */
  remove: () => [...orderKeys.all, 'remove'] as const,
};

export function ordersInfiniteQueryOptions(filters: OrderListFilters = {}) {
  const normalized: OrderListFilters = {
    limit: filters.limit ?? DEFAULT_PAGE_SIZE,
    sort: filters.sort ?? DEFAULT_ORDER_SORT,
    status: filters.status,
  };
  return infiniteQueryOptions({
    queryKey: orderKeys.list(normalized),
    queryFn: ({ pageParam, signal }) =>
      ordersApi.list(
        {
          limit: normalized.limit ?? DEFAULT_PAGE_SIZE,
          sort: normalized.sort,
          status: normalized.status,
          cursor: pageParam,
        },
        signal,
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: getNextCursor,
  });
}

export function orderQueryOptions(id: string) {
  return queryOptions({
    queryKey: orderKeys.detail(id),
    queryFn: ({ signal }) => ordersApi.get(id, signal),
  });
}

export function orderStatsQueryOptions() {
  return queryOptions({
    queryKey: orderKeys.stats(),
    queryFn: ({ signal }) => ordersApi.stats(signal),
    staleTime: 5 * 60_000,
  });
}

export function useOrdersInfinite(filters: OrderListFilters = {}) {
  return useInfiniteQuery(ordersInfiniteQueryOptions(filters));
}

export function useOrder(id: string) {
  return useQuery(orderQueryOptions(id));
}

export function useOrderStats() {
  return useQuery(orderStatsQueryOptions());
}
