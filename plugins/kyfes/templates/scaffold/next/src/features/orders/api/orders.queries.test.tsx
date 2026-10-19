import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider, useInfiniteQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { delay, http as mswHttp, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { db } from '@/mocks/data';
import { errorHandlers } from '@/mocks/handlers';
import { server } from '@/mocks/node';
import { ApiError } from '@/shared/api';
import { createTestQueryClient } from '@/test/render';
import { useCreateOrder, useDeleteOrder } from './orders.mutations';
import { orderKeys, ordersInfiniteQueryOptions, useOrderStats } from './orders.queries';
import { DEFAULT_API_BASE_URL } from '@/shared/config/constants';
import { ORDER_QUERY_SCOPE, ORDER_STATUS, ORDERS_ENDPOINT } from '../constants';

function setup() {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

describe('orders queries', () => {
  it('builds hierarchical keys', () => {
    expect(orderKeys.list({ limit: 20, status: ORDER_STATUS.draft })).toEqual([
      ORDERS_ENDPOINT,
      ORDER_QUERY_SCOPE.list,
      { limit: 20, status: ORDER_STATUS.draft },
    ]);
    expect(orderKeys.detail('1')).toEqual([ORDERS_ENDPOINT, ORDER_QUERY_SCOPE.detail, '1']);
  });

  it('loads cursor pages parsed with Zod', async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useInfiniteQuery(ordersInfiniteQueryOptions({}, 20)), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0]?.items).toHaveLength(20);
    expect(result.current.hasNextPage).toBe(true);

    await act(() => result.current.fetchNextPage());
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
    expect(result.current.data?.pages[1]?.items).toHaveLength(10);
    expect(result.current.hasNextPage).toBe(false);
  });

  it('exposes ApiError on failure (no retry on 4xx)', async () => {
    server.use(errorHandlers.ordersForbidden);
    const { wrapper } = setup();
    const { result } = renderHook(() => useInfiniteQuery(ordersInfiniteQueryOptions()), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect(result.current.error).toMatchObject({ status: 403, code: 'FORBIDDEN' });
  });

  it('maps stats for the chart', async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useOrderStats(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0]).toMatchObject({ month: '2026-01' });
  });
});

describe('orders mutations', () => {
  it('create invalidates the lists', async () => {
    const { queryClient, wrapper } = setup();
    const list = renderHook(() => useInfiniteQuery(ordersInfiniteQueryOptions()), { wrapper });
    await waitFor(() => expect(list.result.current.isSuccess).toBe(true));
    const listKey = ordersInfiniteQueryOptions().queryKey;
    const before = queryClient.getQueryState(listKey)?.dataUpdatedAt ?? 0;

    const create = renderHook(() => useCreateOrder(), { wrapper });
    await act(() =>
      create.result.current.mutateAsync({
        customerName: 'New Co',
        status: ORDER_STATUS.draft,
        total: 42,
      }),
    );

    await waitFor(() =>
      expect(queryClient.getQueryState(listKey)?.dataUpdatedAt ?? 0).toBeGreaterThan(before),
    );
    expect(queryClient.getQueryData(listKey)?.pages[0]?.items[0]?.customerName).toBe('New Co');
  });

  it('delete is optimistic and rolls back on error', async () => {
    const { queryClient, wrapper } = setup();
    const list = renderHook(() => useInfiniteQuery(ordersInfiniteQueryOptions()), { wrapper });
    await waitFor(() => expect(list.result.current.isSuccess).toBe(true));
    const first = list.result.current.data!.pages[0]!.items[0]!;
    const listKey = ordersInfiniteQueryOptions().queryKey;

    // viewer: the server answers 403 → rollback
    const { setMockUser } = await import('@/mocks/data');
    setMockUser('viewer');
    const del = renderHook(() => useDeleteOrder(), { wrapper });
    await act(() => del.result.current.mutateAsync(first.id).catch(() => undefined));
    await waitFor(() =>
      expect(queryClient.getQueryData(listKey)?.pages[0]?.items[0]?.id).toBe(first.id),
    );
  });

  it('concurrent deletes: the first fails, the second row does not reappear', async () => {
    const { queryClient, wrapper } = setup();
    const list = renderHook(() => useInfiniteQuery(ordersInfiniteQueryOptions()), { wrapper });
    await waitFor(() => expect(list.result.current.isSuccess).toBe(true));
    const [a, b] = list.result.current.data!.pages[0]!.items;
    const listKey = ordersInfiniteQueryOptions().queryKey;
    const ids = () =>
      queryClient.getQueryData(listKey)?.pages.flatMap((p) => p.items.map((o) => o.id));

    server.use(
      mswHttp.delete(`${DEFAULT_API_BASE_URL}${ORDERS_ENDPOINT}/:id`, async ({ params }) => {
        if (params.id === a!.id) {
          await delay(20);
          return HttpResponse.json({ code: 'INTERNAL' }, { status: 500 });
        }
        await delay(150);
        db.orders = db.orders.filter((o) => o.id !== params.id);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const first = renderHook(() => useDeleteOrder(), { wrapper });
    const second = renderHook(() => useDeleteOrder(), { wrapper });
    const failing = first.result.current.mutateAsync(a!.id).catch(() => undefined);
    const succeeding = second.result.current.mutateAsync(b!.id);

    await failing;
    expect(ids()).not.toContain(b!.id);

    await succeeding;
    await waitFor(() => expect(ids()).toContain(a!.id));
    expect(ids()).not.toContain(b!.id);
  });

  it('removes the detail cache only when the delete succeeds', async () => {
    const { queryClient, wrapper } = setup();
    const order = db.orders[0]!;
    queryClient.setQueryData(orderKeys.detail(order.id), order);
    const { setMockUser } = await import('@/mocks/data');
    setMockUser('viewer');
    const del = renderHook(() => useDeleteOrder(), { wrapper });
    await act(() => del.result.current.mutateAsync(order.id).catch(() => undefined));
    expect(queryClient.getQueryData(orderKeys.detail(order.id))).toEqual(order);

    setMockUser('manager');
    await act(() => del.result.current.mutateAsync(order.id));
    expect(queryClient.getQueryData(orderKeys.detail(order.id))).toBeUndefined();
  });
});
