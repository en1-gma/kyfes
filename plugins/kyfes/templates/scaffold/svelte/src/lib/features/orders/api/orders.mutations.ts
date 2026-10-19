import {
	createMutation,
	mutationOptions,
	type InfiniteData,
	type QueryClient
} from '@tanstack/svelte-query';
import type { OrderPayload } from '../model/orders.schema';
import { ordersApi, type OrderPage } from './orders.api';
import { orderKeys } from './orders.queries';

type OrdersListData = InfiniteData<OrderPage, string | undefined>;

function invalidateListsAndStats(client: QueryClient) {
	return Promise.all([
		client.invalidateQueries({ queryKey: orderKeys.lists() }),
		client.invalidateQueries({ queryKey: orderKeys.stats() })
	]);
}

export const createOrderMutationOptions = mutationOptions({
	mutationFn: (payload: OrderPayload) => ordersApi.create(payload),
	onSuccess: (order, _input, _result, { client }) => {
		client.setQueryData(orderKeys.detail(order.id), order);
		return invalidateListsAndStats(client);
	}
});

export const updateOrderMutationOptions = mutationOptions({
	mutationFn: ({ id, payload }: { id: string; payload: OrderPayload }) =>
		ordersApi.update(id, payload),
	onSuccess: (order, _vars, _result, { client }) => {
		client.setQueryData(orderKeys.detail(order.id), order);
		return invalidateListsAndStats(client);
	}
});

/** Shared by every delete: lets a delete know whether others are still in flight. */
export const deleteOrderMutationKey = orderKeys.deletes();

/** Other deletes in flight besides the current one (still counted while its callbacks run). */
const othersDeleting = (client: QueryClient) =>
	client.isMutating({ mutationKey: deleteOrderMutationKey }) > 1;

/**
 * Optimistic delete: the row disappears immediately and comes back if the server refuses.
 * With concurrent deletes the snapshot of a failed one still contains the rows the others are
 * removing: it is restored only if no other delete is in flight, otherwise the lists are marked
 * stale and the last delete to settle refetches them.
 */
export const deleteOrderMutationOptions = mutationOptions({
	mutationKey: deleteOrderMutationKey,
	mutationFn: (id: string) => ordersApi.remove(id),
	onMutate: async (id, { client }) => {
		await client.cancelQueries({ queryKey: orderKeys.lists() });
		const previous = client.getQueriesData<OrdersListData>({ queryKey: orderKeys.lists() });
		client.setQueriesData<OrdersListData>({ queryKey: orderKeys.lists() }, (data) =>
			data
				? {
						...data,
						pages: data.pages.map((page) => ({
							...page,
							items: page.items.filter((order) => order.id !== id)
						}))
					}
				: data
		);
		return { previous };
	},
	onError: (_error, _id, result, { client }) => {
		if (othersDeleting(client)) {
			return client.invalidateQueries({ queryKey: orderKeys.lists(), refetchType: 'none' });
		}
		for (const [key, data] of result?.previous ?? []) client.setQueryData(key, data);
	},
	onSettled: (_data, error, id, _result, { client }) => {
		// The detail cache goes away only when the server really deleted the order.
		if (!error) client.removeQueries({ queryKey: orderKeys.detail(id) });
		if (othersDeleting(client)) return;
		return invalidateListsAndStats(client);
	}
});

export const useCreateOrder = () => createMutation(() => createOrderMutationOptions);
export const useUpdateOrder = () => createMutation(() => updateOrderMutationOptions);
export const useDeleteOrder = () => createMutation(() => deleteOrderMutationOptions);
