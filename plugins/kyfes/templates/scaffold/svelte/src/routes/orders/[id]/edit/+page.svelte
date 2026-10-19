<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { OrderEditor } from '$lib/features/orders';
	import { m } from '$lib/shared/i18n';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();
</script>

<svelte:head><title>{m.orders_edit_title()}</title></svelte:head>

<h1>{m.orders_edit_title()}</h1>
<OrderEditor id={params.id} onsaved={(order) => goto(resolve('/orders/[id]', { id: order.id }))} />
