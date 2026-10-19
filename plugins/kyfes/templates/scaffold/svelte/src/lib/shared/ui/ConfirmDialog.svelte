<script lang="ts">
	import { m } from '$lib/shared/i18n';
	import Button from './Button.svelte';
	import { BUTTON_VARIANT } from './button';

	let {
		open = $bindable(false),
		title,
		message,
		confirmLabel,
		danger = false,
		onconfirm
	}: {
		open?: boolean;
		title: string;
		message: string;
		confirmLabel?: string;
		danger?: boolean;
		onconfirm: () => void;
	} = $props();

	let dialog: HTMLDialogElement | undefined = $state();
	const titleId = $props.id();

	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal?.();
		if (!open && dialog.open) dialog.close();
	});

	// onconfirm first: a caller bound to `open` may clear the pending record on close.
	function confirm() {
		onconfirm();
		open = false;
	}
</script>

<dialog bind:this={dialog} aria-labelledby={titleId} onclose={() => (open = false)}>
	<h2 id={titleId}>{title}</h2>
	<p>{message}</p>
	<div class="actions">
		<Button onclick={() => (open = false)}>{m.common_cancel()}</Button>
		<Button variant={danger ? BUTTON_VARIANT.danger : BUTTON_VARIANT.primary} onclick={confirm}>
			{confirmLabel ?? m.common_confirm()}
		</Button>
	</div>
</dialog>

<style>
	dialog {
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		padding: var(--space-4);
		max-width: 28rem;
	}
	.actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-2);
	}
</style>
