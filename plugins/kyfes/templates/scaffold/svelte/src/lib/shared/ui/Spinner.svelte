<script lang="ts">
	import { m } from '$lib/shared/i18n';

	let { label }: { label?: string } = $props();
</script>

<div class="spinner" role="status" aria-live="polite">
	<span class="dot" aria-hidden="true"></span>
	<span>{label ?? m.common_loading()}</span>
</div>

<style>
	.spinner {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-3);
		color: var(--color-text-muted);
	}
	.dot {
		width: 1rem;
		height: 1rem;
		border-radius: 50%;
		border: 2px solid var(--color-border);
		border-top-color: var(--color-primary);
		animation: spin 0.8s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
