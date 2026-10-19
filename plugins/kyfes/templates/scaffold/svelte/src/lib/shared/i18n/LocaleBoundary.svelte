<script lang="ts">
	import type { Snippet } from 'svelte';
	import { localeState } from './locale.svelte';

	let { children }: { children: Snippet } = $props();
</script>

<!-- Paraglide messages are plain functions: re-render the subtree when the locale changes. -->
{#key localeState.current}
	{@render children()}
{/key}
