import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { db } from '@/mocks/data';
import { apiError } from '@/mocks/handlers';
import { server } from '@/mocks/node';
import { createTestQueryClient } from '@/test/render';
import { useCreateOrder, useDeleteOrder } from './orders.mutations';
import {
  orderKeys,
  ordersInfiniteQueryOptions,
  useOrder,
  useOrdersInfinite,
  useOrderStats,
} from './orders.queries';

function setup() {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

const listState = (qc: QueryClient) => qc.getQueryState(ordersInfiniteQueryOptions().queryKey);

describe('orders queries', () => {
  it('builds hierarchical keys', () => {
    expect(orderKeys.detail('1')).toEqual(['orders', 'detail', '1']);
    expect(ordersInfiniteQueryOptions({ status: 'draft' }).queryKey).toEqual([
      'orders',
      'list',
      { limit: 20, sort: 'createdAt:desc', status: 'draft' },
    ]);
  });

  it('lists orders with cursor pagination (Zod-validated)', async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useOrdersInfinite(), { wrapper });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data?.pages[0]?.items).toHaveLength(20);
    expect(result.current.hasNextPage).toBe(true);
    await act(() => result.current.fetchNextPage());
    await act(() => result.current.fetchNextPage());
    await waitFor(() => {
      expect(result.current.data?.pages).toHaveLength(3);
    });
    expect(result.current.data?.pages.flatMap((p) => p.items)).toHaveLength(45);
    expect(result.current.hasNextPage).toBe(false);
  });

  it('gets one order and the stats', async () => {
    const { wrapper } = setup();
    const id = db.orders[3]!.id;
    const order = renderHook(() => useOrder(id), { wrapper });
    const stats = renderHook(() => useOrderStats(), { wrapper });
    await waitFor(() => {
      expect(order.result.current.data?.id).toBe(id);
    });
    await waitFor(() => {
      expect(stats.result.current.data?.months.length).toBeGreaterThan(0);
    });
  });

  it('exposes 404 as ApiError without retrying', async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useOrder('00000000-0000-4000-8000-999999999999'), { wrapper });
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error).toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });
});

describe('orders mutations', () => {
  it('create invalidates the lists', async () => {
    const { queryClient, wrapper } = setup();
    const list = renderHook(() => useOrdersInfinite(), { wrapper });
    // Reading `data` here subscribes the hook to data changes (tracked result props).
    await waitFor(() => {
      expect(list.result.current.data?.pages[0]?.items).toHaveLength(20);
    });
    const create = renderHook(() => useCreateOrder(), { wrapper });

    await act(() =>
      create.result.current.mutateAsync({ customerName: 'New Co', status: 'draft', total: 10 }),
    );

    await waitFor(() => {
      expect(list.result.current.data?.pages[0]?.items[0]?.customerName).toBe('New Co');
    });
    expect(listState(queryClient)?.isInvalidated).toBe(false);
    expect(listState(queryClient)?.dataUpdateCount).toBeGreaterThan(1);
  });

  it('delete removes the row optimistically and rolls back on error', async () => {
    const { queryClient, wrapper } = setup();
    const list = renderHook(() => useOrdersInfinite(), { wrapper });
    // Reading `data` here subscribes the hook to data changes (tracked result props).
    await waitFor(() => {
      expect(list.result.current.data?.pages[0]?.items).toHaveLength(20);
    });
    const target = list.result.current.data!.pages[0]!.items[0]!;
    server.use(
      http.delete('/api/orders/:id', async () => {
        await delay(50);
        return apiError(500, 'INTERNAL', 'boom');
      }),
    );
    const remove = renderHook(() => useDeleteOrder(), { wrapper });

    act(() => {
      remove.result.current.mutate(target);
    });
    await waitFor(() => {
      const ids = queryClient
        .getQueryData(ordersInfiniteQueryOptions().queryKey)
        ?.pages.flatMap((p) => p.items.map((o) => o.id));
      expect(ids).not.toContain(target.id);
    });
    await waitFor(() => {
      expect(remove.result.current.isError).toBe(true);
    });
    await waitFor(() => {
      expect(list.result.current.data?.pages[0]?.items[0]?.id).toBe(target.id);
    });
  });

  it('a failing delete does not bring back a row whose delete is still in flight', async () => {
    const { queryClient, wrapper } = setup();
    const list = renderHook(() => useOrdersInfinite(), { wrapper });
    await waitFor(() => {
      expect(list.result.current.data?.pages[0]?.items).toHaveLength(20);
    });
    const [first, second] = list.result.current.data!.pages[0]!.items;
    server.use(
      http.delete('/api/orders/:id', async ({ params }) => {
        if (params.id === first!.id) {
          await delay(20);
          return apiError(500, 'INTERNAL', 'boom');
        }
        await delay(200);
        db.orders = db.orders.filter((o) => o.id !== params.id);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const a = renderHook(() => useDeleteOrder(), { wrapper });
    const b = renderHook(() => useDeleteOrder(), { wrapper });
    act(() => {
      b.result.current.mutate(second!);
      a.result.current.mutate(first!);
    });
    await waitFor(() => {
      expect(a.result.current.isError).toBe(true);
    });
    const ids = () =>
      queryClient
        .getQueryData(ordersInfiniteQueryOptions().queryKey)
        ?.pages.flatMap((p) => p.items.map((o) => o.id)) ?? [];
    expect(ids()).not.toContain(second!.id);
    await waitFor(() => {
      expect(b.result.current.isSuccess).toBe(true);
    });
    await waitFor(() => {
      expect(ids()).toContain(first!.id);
    });
    expect(ids()).not.toContain(second!.id);
  });
});
