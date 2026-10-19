<script lang="ts">
	import { m } from '$lib/shared/i18n';
	import Button from './Button.svelte';

	/** Footer of a cursor-paginated list: loaded count + "load more" while `nextCursor` is present. */
	let {
		summary,
		query
	}: {
		/** Already translated "N items shown" text, announced to screen readers. */
		summary: string;
		query: { hasNextPage: boolean; isFetchingNextPage: boolean; fetchNextPage: () => unknown };
	} = $props();
</script>

<p class="count" aria-live="polite">{summary}</p>
{#if query.hasNextPage}
	<Button disabled={query.isFetchingNextPage} onclick={() => void query.fetchNextPage()}>
		{query.isFetchingNextPage ? m.common_loading() : m.common_load_more()}
	</Button>
{/if}

<style>
	.count {
		color: var(--color-text-muted);
	}
</style>
