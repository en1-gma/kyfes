import {
	createMutation,
	mutationOptions,
	type InfiniteData,
	type QueryClient
} from '@tanstack/svelte-query';
import type { OrderInput } from '../model/orders.schema';
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
	mutationFn: (input: OrderInput) => ordersApi.create(input),
	onSuccess: (order, _input, _result, { client }) => {
		client.setQueryData(orderKeys.detail(order.id), order);
		return invalidateListsAndStats(client);
	}
});

export const updateOrderMutationOptions = mutationOptions({
	mutationFn: ({ id, input }: { id: string; input: OrderInput }) => ordersApi.update(id, input),
	onSuccess: (order, _vars, _result, { client }) => {
		client.setQueryData(orderKeys.detail(order.id), order);
		return invalidateListsAndStats(client);
	}
});

/** Optimistic delete: the row disappears immediately and comes back if the server refuses. */
export const deleteOrderMutationOptions = mutationOptions({
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
		for (const [key, data] of result?.previous ?? []) client.setQueryData(key, data);
	},
	onSettled: (_data, error, id, _result, { client }) => {
		if (!error) client.removeQueries({ queryKey: orderKeys.detail(id) });
		return invalidateListsAndStats(client);
	}
});

export const useCreateOrder = () => createMutation(() => createOrderMutationOptions);
export const useUpdateOrder = () => createMutation(() => updateOrderMutationOptions);
export const useDeleteOrder = () => createMutation(() => deleteOrderMutationOptions);
