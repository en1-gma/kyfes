<script lang="ts" generics="T">
	import type { Snippet } from 'svelte';
	import EmptyState from './EmptyState.svelte';
	import ErrorState from './ErrorState.svelte';
	import Spinner from './Spinner.svelte';

	/** Loading → error (with retry) → empty → content: the same sequence for every query. */
	let {
		query,
		isEmpty = false,
		emptyTitle,
		children
	}: {
		/** The fields of a TanStack Query result used to pick the state to render. */
		query: { isPending: boolean; error: unknown; data: T | undefined; refetch: () => unknown };
		isEmpty?: boolean;
		emptyTitle?: string;
		children: Snippet<[T]>;
	} = $props();
</script>

{#if query.isPending}
	<Spinner />
{:else if query.error}
	<ErrorState error={query.error} onretry={() => void query.refetch()} />
{:else if isEmpty}
	<EmptyState title={emptyTitle} />
{:else if query.data !== undefined}
	{@render children(query.data)}
{/if}
