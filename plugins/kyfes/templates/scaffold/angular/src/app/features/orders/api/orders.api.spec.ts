import { TestBed } from '@angular/core/testing';
import { QueryClient } from '@tanstack/angular-query-experimental';
import { createTestQueryClient, provideTestApp } from '../../../../testing/providers';
import { injectCreateOrder, injectDeleteOrder } from './orders.mutations';
import { OrdersApi } from './orders.api';
import { orderKeys, orderStatsQueryOptions, ordersInfiniteQueryOptions } from './orders.queries';

function setup() {
  const queryClient = createTestQueryClient();
  TestBed.configureTestingModule({ providers: provideTestApp(queryClient) });
  return { queryClient: TestBed.inject(QueryClient), api: TestBed.inject(OrdersApi) };
}

describe('orders queries e mutations (MSW)', () => {
  it('lista a cursore: prima pagina e pagina successiva', async () => {
    const { queryClient, api } = setup();
    const options = ordersInfiniteQueryOptions(api, { limit: 20 });
    const first = await queryClient.fetchInfiniteQuery(options);
    expect(first.pages[0]?.items).toHaveLength(20);
    expect(first.pages[0]?.nextCursor).toBe('20');
    expect(options.queryKey).toEqual(['orders', 'list', { limit: 20 }]);

    queryClient.clear();
    const all = await queryClient.fetchInfiniteQuery({ ...options, pages: 3 });
    expect(all.pages.flatMap((p) => p.items)).toHaveLength(45);
    expect(all.pages.at(-1)?.nextCursor).toBeNull();
  });

  it('stats trasformate per il grafico', async () => {
    const { queryClient, api } = setup();
    const options = orderStatsQueryOptions(api);
    const raw = await queryClient.fetchQuery(options);
    const data = options.select?.(raw);
    expect(data?.categories.length).toBeGreaterThan(0);
    expect(data?.categories.length).toBe(data?.values.length);
  });

  it('create invalida la lista e le statistiche', async () => {
    const { queryClient, api } = setup();
    const listKey = orderKeys.list({ limit: 20 });
    await queryClient.fetchInfiniteQuery(ordersInfiniteQueryOptions(api, { limit: 20 }));
    await queryClient.fetchQuery(orderStatsQueryOptions(api));

    const create = TestBed.runInInjectionContext(() => injectCreateOrder());
    const order = await create.mutateAsync({ customerName: 'ACME', status: 'draft', total: 10 });

    expect(order.customerName).toBe('ACME');
    expect(queryClient.getQueryState(listKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(orderKeys.stats())?.isInvalidated).toBe(true);
    expect(queryClient.getQueryData(orderKeys.detail(order.id))).toEqual(order);
  });

  it('delete: aggiornamento ottimistico con rollback se il server rifiuta', async () => {
    const { queryClient, api } = setup();
    const listKey = orderKeys.list({ limit: 20 });
    const data = await queryClient.fetchInfiniteQuery(ordersInfiniteQueryOptions(api, { limit: 20 }));
    const shipped = data.pages[0]?.items.find((o) => o.status === 'shipped');
    expect(shipped).toBeDefined();

    const remove = TestBed.runInInjectionContext(() => injectDeleteOrder());
    await expect(remove.mutateAsync(shipped?.id ?? '')).rejects.toMatchObject({ status: 403 });

    type Pages = typeof data;
    const after = queryClient.getQueryData<Pages>(listKey);
    expect(after?.pages[0]?.items.some((o) => o.id === shipped?.id)).toBe(true);
  });
});
