<script lang="ts">
	import { QueryClientProvider, type QueryClient } from '@tanstack/svelte-query';
	import type { Snippet } from 'svelte';

	let { client, children }: { client: QueryClient; children: Snippet } = $props();
</script>

<QueryClientProvider {client}>
	{@render children()}
</QueryClientProvider>
