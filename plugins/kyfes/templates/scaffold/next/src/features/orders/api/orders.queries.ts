import {
  infiniteQueryOptions,
  queryOptions,
  useInfiniteQuery,
  useQuery,
} from '@tanstack/react-query';
import { DEFAULT_PAGE_SIZE } from '@/shared/api';
import type { OrderListFilters } from '../model/orders.schema';
import { ORDERS_ENDPOINT, ordersApi } from './orders.api';

/** Key factory: the only way to build orders query keys. */
export const orderKeys = {
  all: [ORDERS_ENDPOINT] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (filters: OrderListFilters & { limit: number }) => [...orderKeys.lists(), filters] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
  stats: () => [...orderKeys.all, 'stats'] as const,
  /** Shared by every delete: lets each one know whether others are still in flight. */
  remove: () => [...orderKeys.all, 'remove'] as const,
};

export function ordersInfiniteQueryOptions(
  filters: OrderListFilters = {},
  limit = DEFAULT_PAGE_SIZE,
) {
  return infiniteQueryOptions({
    queryKey: orderKeys.list({ ...filters, limit }),
    queryFn: ({ pageParam, signal }) =>
      ordersApi.list(
        { limit, cursor: pageParam, sort: filters.sort, status: filters.status },
        signal,
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
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

/** Monthly totals, already shaped for the chart. */
export function useOrderStats() {
  return useQuery({
    ...orderStatsQueryOptions(),
    select: (stats) =>
      stats.months.map((i) => ({ month: i.month, total: i.total, count: i.count })),
  });
}
