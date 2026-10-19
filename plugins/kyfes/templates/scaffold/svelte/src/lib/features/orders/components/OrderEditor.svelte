<script lang="ts">
	import { ErrorState, Spinner } from '$lib/shared/ui';
	import { useOrder } from '../api/orders.queries';
	import type { Order } from '../model/orders.schema';
	import OrderForm from './OrderForm.svelte';

	/** Loads the order, then shows the form pre-filled. */
	let { id, onsaved }: { id: string; onsaved?: (order: Order) => void } = $props();

	const order = useOrder(() => id);
</script>

{#if order.isPending}
	<Spinner />
{:else if order.isError}
	<ErrorState error={order.error} onretry={() => order.refetch()} />
{:else}
	<OrderForm order={order.data} {onsaved} />
{/if}
