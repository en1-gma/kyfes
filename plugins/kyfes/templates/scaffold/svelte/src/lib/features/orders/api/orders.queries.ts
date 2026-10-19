import {
	createInfiniteQuery,
	createQuery,
	infiniteQueryOptions,
	queryOptions
} from '@tanstack/svelte-query';
import { DEFAULT_PAGE_SIZE } from '$lib/shared/api';
import type { ChartDatum } from '$lib/shared/charts';
import { formatDate } from '$lib/shared/i18n';
import type { OrderStats } from '../model/orders.schema';
import { ordersApi } from './orders.api';

export type OrdersFilters = { limit?: number; sort?: string };

/** Key factory: the only way to build orders query keys. */
export const orderKeys = {
	all: ['orders'] as const,
	lists: () => [...orderKeys.all, 'list'] as const,
	list: (filters: Required<OrdersFilters>) => [...orderKeys.lists(), filters] as const,
	details: () => [...orderKeys.all, 'detail'] as const,
	detail: (id: string) => [...orderKeys.details(), id] as const,
	stats: () => [...orderKeys.all, 'stats'] as const
};

export function ordersInfiniteQueryOptions(filters: OrdersFilters = {}) {
	const normalized = {
		limit: filters.limit ?? DEFAULT_PAGE_SIZE,
		sort: filters.sort ?? '-createdAt'
	};
	return infiniteQueryOptions({
		queryKey: orderKeys.list(normalized),
		queryFn: ({ pageParam }) => ordersApi.list({ ...normalized, cursor: pageParam }),
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined
	});
}

export function orderQueryOptions(id: string) {
	return queryOptions({
		queryKey: orderKeys.detail(id),
		queryFn: () => ordersApi.get(id)
	});
}

/** Monthly totals already shaped for shared/charts (labels formatted with Intl). */
export function toMonthlyTotals(stats: OrderStats): ChartDatum[] {
	return stats.months.map(({ month, total }) => ({
		label: formatDate(`${month}-01T00:00:00Z`, {
			month: 'short',
			year: 'numeric',
			timeZone: 'UTC'
		}),
		value: total
	}));
}

export function orderStatsQueryOptions() {
	return queryOptions({
		queryKey: orderKeys.stats(),
		queryFn: () => ordersApi.stats(),
		select: toMonthlyTotals,
		staleTime: 5 * 60_000
	});
}

export function useOrders(filters: () => OrdersFilters = () => ({})) {
	return createInfiniteQuery(() => ordersInfiniteQueryOptions(filters()));
}

export function useOrder(id: () => string) {
	return createQuery(() => orderQueryOptions(id()));
}

export function useOrderStats() {
	return createQuery(() => orderStatsQueryOptions());
}
