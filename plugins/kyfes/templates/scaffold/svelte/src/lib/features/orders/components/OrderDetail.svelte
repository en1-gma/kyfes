<script lang="ts">
	import { resolve } from '$app/paths';
	import { m, formatCurrency, formatDate } from '$lib/shared/i18n';
	import { useAbility } from '$lib/shared/rbac';
	import { Button, ConfirmDialog, ErrorState, Spinner } from '$lib/shared/ui';
	import { useDeleteOrder } from '../api/orders.mutations';
	import { useOrder } from '../api/orders.queries';
	import { asOrderSubject } from '../permissions';
	import { orderStatusLabel } from './order-status';

	let { id, ondeleted }: { id: string; ondeleted?: () => void } = $props();

	const order = useOrder(() => id);
	const remove = useDeleteOrder();
	const ability = useAbility();
	let confirmOpen = $state(false);

	const record = $derived(order.data ? asOrderSubject(order.data) : undefined);

	function confirmDelete() {
		remove.mutate(id, { onSuccess: () => ondeleted?.() });
	}
</script>

{#if order.isPending}
	<Spinner />
{:else if order.isError}
	<ErrorState error={order.error} onretry={() => order.refetch()} />
{:else}
	<article class="order-detail">
		<h1>{m.orders_detail_title({ number: order.data.number })}</h1>
		<dl>
			<dt>{m.orders_field_customer()}</dt>
			<dd>{order.data.customerName}</dd>
			<dt>{m.orders_field_status()}</dt>
			<dd>{orderStatusLabel(order.data.status)}</dd>
			<dt>{m.orders_field_total()}</dt>
			<dd>{formatCurrency(order.data.total)}</dd>
			<dt>{m.orders_field_created()}</dt>
			<dd>{formatDate(order.data.createdAt, { dateStyle: 'long', timeStyle: 'short' })}</dd>
		</dl>
		{#if remove.isError}
			<ErrorState error={remove.error} />
		{/if}
		<div class="actions">
			{#if record && ability.can('update', record)}
				<a href={resolve('/orders/[id]/edit', { id })}>{m.orders_action_edit()}</a>
			{/if}
			{#if record && ability.can('delete', record)}
				<Button variant="danger" onclick={() => (confirmOpen = true)}>
					{m.orders_action_delete()}
				</Button>
			{/if}
		</div>
	</article>
	<ConfirmDialog
		bind:open={confirmOpen}
		danger
		title={m.orders_delete_title()}
		message={m.orders_delete_text({ number: order.data.number })}
		confirmLabel={m.orders_action_delete()}
		onconfirm={confirmDelete}
	/>
{/if}

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
