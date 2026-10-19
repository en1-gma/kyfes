<script lang="ts">
	import { resolve } from '$app/paths';
	import { ORDER_SUBJECT, OrdersChart, OrdersTable } from '$lib/features/orders';
	import { m } from '$lib/shared/i18n';
	import { Can } from '$lib/shared/rbac';
</script>

<svelte:head><title>{m.orders_list_title()}</title></svelte:head>

<div class="page-header">
	<h1>{m.orders_list_title()}</h1>
	<Can I="create" a={ORDER_SUBJECT}>
		<a class="new" href={resolve('/orders/new')}>{m.orders_new()}</a>
	</Can>
</div>

<OrdersChart />
<OrdersTable />

<style>
	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
</style>
