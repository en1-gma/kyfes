<script lang="ts">
	import type { Snippet } from 'svelte';
	import { useSession } from '$lib/shared/auth';
	import { AbilityState, setAbilityContext } from './ability-state.svelte';

	let { children }: { children: Snippet } = $props();

	const session = useSession();
	const abilityState = setAbilityContext(new AbilityState());

	// The ability follows the session: new rules (login, refresh, 403 → invalidate) update the UI.
	$effect.pre(() => {
		abilityState.update(session.data?.rules ?? []);
	});
</script>

{@render children()}
