<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { OrderForm } from '$lib/features/orders';
	import { m } from '$lib/shared/i18n';
</script>

<svelte:head><title>{m.orders_new_title()}</title></svelte:head>

<h1>{m.orders_new_title()}</h1>
<OrderForm onsaved={(order) => goto(resolve('/orders/[id]', { id: order.id }))} />
