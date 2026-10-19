<script lang="ts">
	import '$lib/shared/ui/theme.css';
	import { QueryProvider } from '$lib/shared/api';
	import { installAuthHandlers } from '$lib/shared/auth';
	import { LocaleBoundary } from '$lib/shared/i18n';
	import { AbilityProvider } from '$lib/shared/rbac';
	import AppShell from './AppShell.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	// 401 → login, 403 → refetch the session (permissions may have changed).
	$effect(() => installAuthHandlers(data.queryClient));
</script>

<QueryProvider client={data.queryClient}>
	<AbilityProvider>
		<LocaleBoundary>
			<AppShell>
				{@render children()}
			</AppShell>
		</LocaleBoundary>
	</AbilityProvider>
</QueryProvider>
