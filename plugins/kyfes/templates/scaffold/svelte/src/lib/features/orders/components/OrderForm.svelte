<script lang="ts">
	import { m } from '$lib/shared/i18n';
	import { useAbility } from '$lib/shared/rbac';
	import { Button, ErrorState } from '$lib/shared/ui';
	import { useCreateOrder, useUpdateOrder } from '../api/orders.mutations';
	import {
		ORDER_STATUSES,
		OrderInputSchema,
		type Order,
		type OrderInput,
		type OrderStatus
	} from '../model/orders.schema';
	import { asOrderSubject, ORDER_SUBJECT } from '../permissions';
	import { orderStatusLabel, validationMessage } from './order-status';

	/** Create (no `order`) or edit an order. Validation with OrderInputSchema (Zod). */
	let { order, onsaved }: { order?: Order; onsaved?: (order: Order) => void } = $props();

	const ability = useAbility();
	const create = useCreateOrder();
	const update = useUpdateOrder();
	const formId = $props.id();

	// Initial values only: the form owns its draft (the order prop is not tracked on purpose).
	const initial = (): { customerName: string; status: OrderStatus; total: string } => ({
		customerName: order?.customerName ?? '',
		status: order?.status ?? 'draft',
		total: order ? String(order.total) : ''
	});
	let values = $state(initial());
	let errors: Partial<Record<keyof OrderInput, string>> = $state({});

	const canEditStatus = $derived(
		order
			? ability.can('update', asOrderSubject(order), 'status')
			: ability.can('create', ORDER_SUBJECT, 'status')
	);
	const mutation = $derived(order ? update : create);

	async function onsubmit(event: SubmitEvent) {
		event.preventDefault();
		const parsed = OrderInputSchema.safeParse({
			customerName: values.customerName,
			status: values.status,
			total: values.total.trim() === '' ? Number.NaN : Number(values.total)
		});
		if (!parsed.success) {
			const next: typeof errors = {};
			for (const issue of parsed.error.issues) {
				const field = issue.path[0] as keyof OrderInput;
				next[field] ??= validationMessage(issue.message);
			}
			errors = next;
			return;
		}
		errors = {};
		const saved = order
			? await update.mutateAsync({ id: order.id, input: parsed.data })
			: await create.mutateAsync(parsed.data);
		onsaved?.(saved);
	}
</script>

<form class="order-form" novalidate {onsubmit}>
	{#if mutation.isError}
		<ErrorState error={mutation.error} />
	{/if}

	<div class="field">
		<label for="{formId}-customer">{m.orders_field_customer()}</label>
		<input
			id="{formId}-customer"
			name="customerName"
			autocomplete="organization"
			bind:value={values.customerName}
			aria-invalid={errors.customerName ? 'true' : undefined}
			aria-describedby={errors.customerName ? `${formId}-customer-error` : undefined}
		/>
		{#if errors.customerName}
			<p id="{formId}-customer-error" class="error">{errors.customerName}</p>
		{/if}
	</div>

	<div class="field">
		<label for="{formId}-status">{m.orders_field_status()}</label>
		<select
			id="{formId}-status"
			name="status"
			bind:value={values.status}
			disabled={!canEditStatus}
			aria-describedby={canEditStatus ? undefined : `${formId}-status-hint`}
		>
			{#each ORDER_STATUSES as status (status)}
				<option value={status}>{orderStatusLabel(status)}</option>
			{/each}
		</select>
		{#if !canEditStatus}
			<p id="{formId}-status-hint" class="hint">{m.orders_status_readonly()}</p>
		{/if}
	</div>

	<div class="field">
		<label for="{formId}-total">{m.orders_field_total()}</label>
		<input
			id="{formId}-total"
			name="total"
			inputmode="decimal"
			bind:value={values.total}
			aria-invalid={errors.total ? 'true' : undefined}
			aria-describedby={errors.total ? `${formId}-total-error` : undefined}
		/>
		{#if errors.total}
			<p id="{formId}-total-error" class="error">{errors.total}</p>
		{/if}
	</div>

	<Button type="submit" variant="primary" disabled={mutation.isPending}>
		{order ? m.orders_form_submit_update() : m.orders_form_submit_create()}
	</Button>
</form>

<style>
	.order-form {
		display: grid;
		gap: var(--space-3);
		max-width: 32rem;
	}
	.field {
		display: grid;
		gap: var(--space-1);
	}
	.error {
		color: var(--color-danger);
		margin: 0;
	}
	.hint {
		color: var(--color-text-muted);
		margin: 0;
	}
</style>
