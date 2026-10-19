<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { BUTTON_VARIANT, type ButtonVariant } from './button';

	let {
		variant = BUTTON_VARIANT.secondary,
		type = 'button',
		children,
		...rest
	}: HTMLButtonAttributes & { variant?: ButtonVariant; children: Snippet } = $props();
</script>

<button {type} class="btn btn-{variant}" {...rest}>
	{@render children()}
</button>

<style>
	.btn {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius);
		border: 1px solid var(--color-border);
		font: inherit;
		cursor: pointer;
		background: var(--color-surface);
		color: var(--color-text);
	}
	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
	.btn-primary {
		background: var(--color-primary);
		border-color: var(--color-primary);
		color: var(--color-primary-contrast);
	}
	.btn-danger {
		background: var(--color-danger);
		border-color: var(--color-danger);
		color: var(--color-danger-contrast);
	}
</style>
