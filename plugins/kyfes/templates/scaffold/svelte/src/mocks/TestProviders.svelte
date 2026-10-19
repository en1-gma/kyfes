<script lang="ts">
	import type { Component } from 'svelte';
	import type { QueryClient } from '@tanstack/svelte-query';
	import { QueryProvider } from '$lib/shared/api';
	import { AbilityProvider } from '$lib/shared/rbac';

	let {
		client,
		component: Child,
		props
	}: {
		client: QueryClient;
		component: Component<Record<string, unknown>>;
		props: Record<string, unknown>;
	} = $props();
</script>

<QueryProvider {client}>
	<AbilityProvider>
		<Child {...props} />
	</AbilityProvider>
</QueryProvider>
