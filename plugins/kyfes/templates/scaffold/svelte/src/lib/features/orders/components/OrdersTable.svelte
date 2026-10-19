<script lang="ts">
	import { resolve } from '$app/paths';
	import { m, formatCurrency, formatDate } from '$lib/shared/i18n';
	import { Action, useAbility } from '$lib/shared/rbac';
	import { Button, ConfirmDeleteDialog, ErrorState, LoadMore, QueryState } from '$lib/shared/ui';
	import { useDeleteOrder } from '../api/orders.mutations';
	import { useOrders } from '../api/orders.queries';
	import type { Order } from '../model/orders.schema';
	import { asOrderSubject, ORDER_SUBJECT } from '../permissions';
	import { orderPaths } from '../routes';
	import { orderStatusLabel } from './order-status';

	const orders = useOrders();
	const remove = useDeleteOrder();
	const ability = useAbility();

	const rows = $derived(orders.data?.pages.flatMap((page) => page.items) ?? []);
	// Column visible if the user may act on at least some orders (type-level check).
	const showActions = $derived(
		ability.can(Action.Update, ORDER_SUBJECT) || ability.can(Action.Delete, ORDER_SUBJECT)
	);

	let pending: Order | undefined = $state();
</script>

<QueryState query={orders} isEmpty={rows.length === 0} emptyTitle={m.orders_empty()}>
	{#if remove.isError}
		<ErrorState error={remove.error} />
	{/if}
	<table>
		<caption class="visually-hidden">{m.orders_table_caption()}</caption>
		<thead>
			<tr>
				<th scope="col">{m.orders_field_number()}</th>
				<th scope="col">{m.orders_field_customer()}</th>
				<th scope="col">{m.orders_field_status()}</th>
				<th scope="col" class="num">{m.orders_field_total()}</th>
				<th scope="col">{m.orders_field_created()}</th>
				{#if showActions}<th scope="col">{m.orders_col_actions()}</th>{/if}
			</tr>
		</thead>
		<tbody>
			{#each rows as order (order.id)}
				{@const record = asOrderSubject(order)}
				<tr>
					<td><a href={resolve(orderPaths.detail, { id: order.id })}>{order.number}</a></td>
					<td>{order.customerName}</td>
					<td>{orderStatusLabel(order.status)}</td>
					<td class="num">{formatCurrency(order.total)}</td>
					<td>{formatDate(order.createdAt)}</td>
					{#if showActions}
						<td class="actions">
							{#if ability.can(Action.Update, record)}
								<a
									href={resolve(orderPaths.edit, { id: order.id })}
									aria-label={m.orders_action_edit_label({ number: order.number })}
									>{m.orders_action_edit()}</a
								>
							{/if}
							{#if ability.can(Action.Delete, record)}
								<Button
									variant="danger"
									aria-label={m.orders_action_delete_label({ number: order.number })}
									onclick={() => (pending = order)}>{m.orders_action_delete()}</Button
								>
							{/if}
						</td>
					{/if}
				</tr>
			{/each}
		</tbody>
	</table>
	<LoadMore summary={m.orders_count({ count: rows.length })} query={orders} />
</QueryState>

<ConfirmDeleteDialog
	item={pending}
	title={m.orders_delete_title()}
	message={m.orders_delete_text({ number: pending?.number ?? '' })}
	confirmLabel={m.orders_action_delete()}
	onconfirm={(order) => remove.mutate(order.id)}
	onclose={() => (pending = undefined)}
/>

<style>
	.num {
		text-align: right;
	}
	.actions {
		display: flex;
		gap: var(--space-2);
		align-items: center;
	}
</style>
