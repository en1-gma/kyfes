<script lang="ts">
	import { resolve } from '$app/paths';
	import { m, formatCurrency, formatDate } from '$lib/shared/i18n';
	import { Action, useAbility } from '$lib/shared/rbac';
	import { Button, ConfirmDeleteDialog, ErrorState, QueryState } from '$lib/shared/ui';
	import { useDeleteOrder } from '../api/orders.mutations';
	import { useOrder } from '../api/orders.queries';
	import { asOrderSubject } from '../permissions';
	import type { Order } from '../model/orders.schema';
	import { orderPaths } from '../routes';
	import { orderStatusLabel } from './order-status';

	let { id, ondeleted }: { id: string; ondeleted?: () => void } = $props();

	const order = useOrder(() => id);
	const remove = useDeleteOrder();
	const ability = useAbility();
	let pending: Order | undefined = $state();

	const record = $derived(order.data ? asOrderSubject(order.data) : undefined);
</script>

<QueryState query={order}>
	{#snippet children(current)}
		<article class="order-detail">
			<h1>{m.orders_detail_title({ number: current.number })}</h1>
			<dl>
				<dt>{m.orders_field_customer()}</dt>
				<dd>{current.customerName}</dd>
				<dt>{m.orders_field_status()}</dt>
				<dd>{orderStatusLabel(current.status)}</dd>
				<dt>{m.orders_field_total()}</dt>
				<dd>{formatCurrency(current.total)}</dd>
				<dt>{m.orders_field_created()}</dt>
				<dd>{formatDate(current.createdAt, { dateStyle: 'long', timeStyle: 'short' })}</dd>
			</dl>
			{#if remove.isError}
				<ErrorState error={remove.error} />
			{/if}
			<div class="actions">
				{#if record && ability.can(Action.Update, record)}
					<a href={resolve(orderPaths.edit, { id })}>{m.orders_action_edit()}</a>
				{/if}
				{#if record && ability.can(Action.Delete, record)}
					<Button variant="danger" onclick={() => (pending = current)}>
						{m.orders_action_delete()}
					</Button>
				{/if}
			</div>
		</article>
	{/snippet}
</QueryState>

<ConfirmDeleteDialog
	item={pending}
	title={m.orders_delete_title()}
	message={m.orders_delete_text({ number: pending?.number ?? '' })}
	confirmLabel={m.orders_action_delete()}
	onconfirm={(target) => remove.mutate(target.id, { onSuccess: () => ondeleted?.() })}
	onclose={() => (pending = undefined)}
/>

<style>
	dl {
		display: grid;
		grid-template-columns: max-content 1fr;
		gap: var(--space-2) var(--space-4);
	}
	dt {
		font-weight: 600;
	}
	dd {
		margin: 0;
	}
	.actions {
		display: flex;
		gap: var(--space-2);
		align-items: center;
	}
</style>
