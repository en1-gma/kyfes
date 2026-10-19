<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { OrderDetail, orderPaths } from '$lib/features/orders';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();
</script>

<OrderDetail id={params.id} ondeleted={() => goto(resolve(orderPaths.list))} />
