<script lang="ts">
	import type { Snippet } from 'svelte';
	import { m } from '$lib/shared/i18n';

	let { title, children }: { title?: string; children?: Snippet } = $props();
</script>

<div class="empty-state">
	<p class="title">{title ?? m.common_empty_title()}</p>
	{#if children}{@render children()}{/if}
</div>

<style>
	.empty-state {
		padding: var(--space-5);
		text-align: center;
		color: var(--color-text-muted);
		background: var(--color-surface);
		border: 1px dashed var(--color-border);
		border-radius: var(--radius);
	}
	.title {
		font-weight: 600;
	}
</style>
