<script lang="ts">
	import type { Snippet } from 'svelte';
	import { useAbility } from './ability-state.svelte';
	import type { Actions, Subjects } from './subjects';

	let {
		I,
		a,
		field,
		not = false,
		children
	}: { I: Actions; a: Subjects; field?: string; not?: boolean; children: Snippet } = $props();

	const ability = useAbility();
	const allowed = $derived(ability.can(I, a, field) !== not);
</script>

{#if allowed}
	{@render children()}
{/if}
