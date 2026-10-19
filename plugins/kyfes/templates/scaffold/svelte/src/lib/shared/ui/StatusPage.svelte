<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '$lib/shared/i18n';

	let { code, title, text }: { code: number; title: string; text: string } = $props();
</script>

<section class="status-page" aria-labelledby="status-title">
	<p class="code" aria-hidden="true">{code}</p>
	<h1 id="status-title">{title}</h1>
	<p>{text}</p>
	<a href={resolve('/')}>{m.common_back_home()}</a>
</section>

<style>
	.status-page {
		max-width: 36rem;
		margin: var(--space-5) auto;
		text-align: center;
	}
	.code {
		font-size: 3rem;
		font-weight: 700;
		margin: 0;
		color: var(--color-text-muted);
	}
</style>
