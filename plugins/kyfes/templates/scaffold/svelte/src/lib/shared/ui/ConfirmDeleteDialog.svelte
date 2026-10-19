<script lang="ts" generics="T">
	import ConfirmDialog from './ConfirmDialog.svelte';

	/** Destructive confirm bound to a record: confirming calls `onconfirm(item)`, then closes. */
	let {
		item,
		title,
		message,
		confirmLabel,
		onconfirm,
		onclose
	}: {
		/** Record waiting for confirmation; `undefined` keeps the dialog closed. */
		item: T | undefined;
		title: string;
		message: string;
		confirmLabel: string;
		onconfirm: (item: T) => void;
		onclose: () => void;
	} = $props();
</script>

<ConfirmDialog
	bind:open={() => item !== undefined, (open) => !open && onclose()}
	danger
	{title}
	{message}
	{confirmLabel}
	onconfirm={() => {
		if (item !== undefined) onconfirm(item);
	}}
/>
