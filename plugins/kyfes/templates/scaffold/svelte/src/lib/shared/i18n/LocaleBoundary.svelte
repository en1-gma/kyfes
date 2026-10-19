<script lang="ts">
	import type { Snippet } from 'svelte';
	import { localeState } from './locale.svelte';

	let { children }: { children: Snippet } = $props();

	// Messages are reactive through localeState (see locale.svelte.ts): no {#key} remount here,
	// which would throw away form drafts. Only <html lang> has to follow the locale.
	$effect(() => {
		document.documentElement.lang = localeState.current;
	});
</script>

{@render children()}
