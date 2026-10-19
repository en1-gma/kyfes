<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { OrderDetail } from '$lib/features/orders';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();
</script>

<OrderDetail id={params.id} ondeleted={() => goto(resolve('/orders'))} />
