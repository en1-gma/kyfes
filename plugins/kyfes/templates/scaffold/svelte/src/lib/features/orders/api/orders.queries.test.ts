import { InfiniteQueryObserver, MutationObserver, QueryClient } from '@tanstack/svelte-query';
import { describe, expect, it } from 'vitest';
import { errorHandlers } from '../../../../mocks/handlers';
import { server } from '../../../../mocks/node';
import { ApiError } from '$lib/shared/api';
import { createOrderMutationOptions, deleteOrderMutationOptions } from './orders.mutations';
import { ordersApi } from './orders.api';
import {
	orderKeys,
	ordersInfiniteQueryOptions,
	orderStatsQueryOptions,
	toMonthlyTotals
} from './orders.queries';

const newClient = () =>
	new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });

describe('orders queries', () => {
	it('loads the first page and follows the cursor', async () => {
		const client = newClient();
		const options = ordersInfiniteQueryOptions({ limit: 20 });
		const data = await client.fetchInfiniteQuery(options);
		expect(data.pages[0]?.items).toHaveLength(20);
		expect(options.queryKey).toEqual(['orders', 'list', { limit: 20, sort: '-createdAt' }]);

		const next = data.pages[0]?.nextCursor;
		expect(next).toBe('20');
		const observer = new InfiniteQueryObserver(client, options);
		const more = await observer.fetchNextPage();
		expect(more.data?.pages).toHaveLength(2);
		expect(more.data?.pages[1]?.items[0]?.number).toBe('ORD-0025');
	});

	it('exposes stats already shaped for the chart', async () => {
		const shaped = toMonthlyTotals(await ordersApi.stats());
		expect(orderStatsQueryOptions().select).toBe(toMonthlyTotals);
		expect(shaped.length).toBeGreaterThan(0);
		expect(shaped[0]).toEqual({ label: expect.any(String), value: expect.any(Number) });
	});

	it('normalizes server errors into ApiError', async () => {
		server.use(errorHandlers.ordersServerError);
		const client = newClient();
		const error = await client
			.fetchInfiniteQuery(ordersInfiniteQueryOptions())
			.catch((e: unknown) => e);
		expect(error).toBeInstanceOf(ApiError);
		expect(error).toMatchObject({ status: 500, correlationId: expect.stringMatching(/^mock-/) });
	});
});

describe('orders mutations', () => {
	it('create invalidates the lists', async () => {
		const client = newClient();
		await client.fetchInfiniteQuery(ordersInfiniteQueryOptions());
		const listKey = ordersInfiniteQueryOptions().queryKey;
		expect(client.getQueryState(listKey)?.isInvalidated).toBe(false);

		const created = await new MutationObserver(client, createOrderMutationOptions).mutate({
			customerName: 'Nuovo Cliente',
			status: 'draft',
			total: 99.5
		});

		expect(created.customerName).toBe('Nuovo Cliente');
		expect(client.getQueryState(listKey)?.isInvalidated).toBe(true);
		expect(client.getQueryData(orderKeys.detail(created.id))).toEqual(created);
	});

	it('delete is optimistic and rolls back on error', async () => {
		server.use(errorHandlers.deleteServerError);
		const client = newClient();
		const options = ordersInfiniteQueryOptions();
		const before = await client.fetchInfiniteQuery(options);
		const target = before.pages[0]?.items[0];
		if (!target) throw new Error('seed data missing');

		const observer = new MutationObserver(client, deleteOrderMutationOptions);
		const pending = observer.mutate(target.id);
		await Promise.resolve();
		await expect(pending).rejects.toBeInstanceOf(ApiError);

		const after = client.getQueryData(options.queryKey);
		expect(after?.pages[0]?.items.some((o) => o.id === target.id)).toBe(true);
	});
});
