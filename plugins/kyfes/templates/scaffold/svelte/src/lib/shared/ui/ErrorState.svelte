<script lang="ts">
	import { isApiError } from '$lib/shared/api';
	import { m } from '$lib/shared/i18n';
	import Button from './Button.svelte';

	/**
	 * Generic message + correlationId: never the raw backend/axios error. A 403 (or `forbidden`,
	 * e.g. a record-level check that fails in the UI) shows "not authorized" instead, without retry.
	 */
	let {
		error,
		correlationId,
		forbidden: forceForbidden = false,
		onretry
	}: {
		error?: unknown;
		correlationId?: string | undefined;
		forbidden?: boolean;
		onretry?: () => void;
	} = $props();

	const id = $derived(correlationId ?? (isApiError(error) ? error.correlationId : undefined));
	const forbidden = $derived(forceForbidden || (isApiError(error) && error.isForbidden));
</script>

<div class="error-state" role="alert">
	<h2>{forbidden ? m.common_forbidden_title() : m.common_error_title()}</h2>
	<p>{forbidden ? m.common_forbidden_text() : m.common_error_generic()}</p>
	{#if id}
		<p class="correlation">{m.common_error_correlation({ correlationId: id })}</p>
	{/if}
	{#if onretry && !forbidden}
		<Button onclick={onretry}>{m.common_retry()}</Button>
	{/if}
</div>

<style>
	.error-state {
		padding: var(--space-4);
		border: 1px solid var(--color-danger);
		border-radius: var(--radius);
		background: var(--color-surface);
	}
	.correlation {
		font-family: ui-monospace, monospace;
		color: var(--color-text-muted);
	}
</style>
