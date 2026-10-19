<script lang="ts">
	import type { Snippet } from 'svelte';
	import { resolve } from '$app/paths';
	import { ORDER_SUBJECT } from '$lib/features/orders';
	import { useLogout, useSession } from '$lib/shared/auth';
	import { initLocale, LocaleSelect, m } from '$lib/shared/i18n';
	import { useAbility } from '$lib/shared/rbac';
	import { Button } from '$lib/shared/ui';

	let { children }: { children: Snippet } = $props();

	const session = useSession();
	const ability = useAbility();
	const logout = useLogout();

	let localeReady = false;
	$effect(() => {
		if (localeReady || session.isPending) return;
		localeReady = true;
		initLocale(session.data?.locale);
	});
</script>

<a class="skip-link" href="#main">{m.common_skip_to_content()}</a>
<header class="app-header">
	<a class="brand" href={resolve('/')}>{m.common_app_title()}</a>
	<nav aria-label={m.common_nav_label()}>
		<ul>
			<li><a href={resolve('/')}>{m.common_nav_home()}</a></li>
			{#if ability.can('read', ORDER_SUBJECT)}
				<li><a href={resolve('/orders')}>{m.orders_nav()}</a></li>
			{/if}
		</ul>
	</nav>
	<div class="tools">
		<LocaleSelect />
		{#if session.data}
			<span class="user">{m.common_user_signed_in({ name: session.data.user.name })}</span>
			<Button onclick={logout}>{m.common_logout()}</Button>
		{/if}
	</div>
</header>
<main id="main" tabindex="-1">
	{@render children()}
</main>

<style>
	.skip-link {
		position: absolute;
		left: -999px;
	}
	.skip-link:focus {
		left: var(--space-3);
		top: var(--space-3);
		background: var(--color-surface);
		padding: var(--space-2);
	}
	.app-header {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-4);
		padding: var(--space-3) var(--space-4);
		background: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
	}
	.brand {
		font-weight: 700;
		text-decoration: none;
	}
	nav ul {
		display: flex;
		gap: var(--space-3);
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.tools {
		margin-left: auto;
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}
	main {
		padding: var(--space-4);
		max-width: 72rem;
		margin: 0 auto;
	}
</style>
