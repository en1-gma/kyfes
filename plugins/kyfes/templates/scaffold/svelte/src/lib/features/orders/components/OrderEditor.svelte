<script lang="ts">
	import { useAbility } from '$lib/shared/rbac';
	import { ErrorState, QueryState } from '$lib/shared/ui';
	import { useOrder } from '../api/orders.queries';
	import type { Order } from '../model/orders.schema';
	import { asOrderSubject } from '../permissions';
	import OrderForm from './OrderForm.svelte';

	/**
	 * Loads the order, then checks the record-level rule (e.g. `update Order { status: 'draft' }`):
	 * the route guard only knows the type. Not allowed → "not authorized", never the form.
	 */
	let { id, onsaved }: { id: string; onsaved?: (order: Order) => void } = $props();

	const order = useOrder(() => id);
	const ability = useAbility();
</script>

<QueryState query={order}>
	{#snippet children(current)}
		{#if ability.can('update', asOrderSubject(current))}
			<OrderForm order={current} {onsaved} />
		{:else}
			<ErrorState forbidden />
		{/if}
	{/snippet}
</QueryState>
