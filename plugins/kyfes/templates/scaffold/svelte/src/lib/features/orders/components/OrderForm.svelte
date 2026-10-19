<script lang="ts">
	import { isApiError } from '$lib/shared/api';
	import { m } from '$lib/shared/i18n';
	import { useAbility } from '$lib/shared/rbac';
	import { Button, ErrorState } from '$lib/shared/ui';
	import { useCreateOrder, useUpdateOrder } from '../api/orders.mutations';
	import {
		ORDER_STATUSES,
		OrderInputSchema,
		type Order,
		type OrderField,
		type OrderStatus
	} from '../model/orders.schema';
	import { canWriteOrderField, ORDER_FIELDS, pickWritableFields } from '../permissions';
	import { orderStatusLabel, validationMessage } from './order-status';

	/**
	 * Create (no `order`) or edit an order. Validation with OrderInputSchema (Zod); the payload
	 * contains only the fields the user may write (POST / PATCH), never a read-only one.
	 */
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
	let errors: Partial<Record<OrderField, string>> = $state({});
	/** Server error without recognised field errors: shown as the generic ErrorState. */
	let submitError: unknown = $state();

	const writable = $derived(
		Object.fromEntries(
			ORDER_FIELDS.map((field) => [field, canWriteOrderField(ability, field, order)])
		) as Record<OrderField, boolean>
	);
	const mutation = $derived(order ? update : create);

	const isOrderField = (field: string): field is OrderField =>
		ORDER_FIELDS.some((known) => known === field);

	/** 422 fieldErrors → messages on the fields; `true` if at least one field was recognised. */
	function applyServerErrors(error: unknown): boolean {
		if (!isApiError(error) || !error.fieldErrors) return false;
		const next: typeof errors = {};
		for (const [field, codes] of Object.entries(error.fieldErrors)) {
			if (isOrderField(field)) next[field] = validationMessage(codes[0] ?? 'invalid');
		}
		errors = next;
		return Object.keys(next).length > 0;
	}

	async function onsubmit(event: SubmitEvent) {
		event.preventDefault();
		submitError = undefined;
		const parsed = OrderInputSchema.safeParse({
			customerName: values.customerName,
			status: values.status,
			total: values.total.trim() === '' ? Number.NaN : Number(values.total)
		});
		if (!parsed.success) {
			const next: typeof errors = {};
			for (const issue of parsed.error.issues) {
				const field = issue.path[0];
				if (typeof field === 'string' && isOrderField(field)) {
					next[field] ??= validationMessage(issue.message);
				}
			}
			errors = next;
			return;
		}
		errors = {};
		const payload = pickWritableFields(parsed.data, (field) => writable[field]);
		try {
			const saved = order
				? await update.mutateAsync({ id: order.id, payload })
				: await create.mutateAsync(payload);
			onsaved?.(saved);
		} catch (error) {
			if (!applyServerErrors(error)) submitError = error;
		}
	}
</script>

<form class="order-form" novalidate {onsubmit}>
	{#if submitError}
		<ErrorState error={submitError} />
	{/if}

	<div class="field">
		<label for="{formId}-customer">{m.orders_field_customer()}</label>
		<input
			id="{formId}-customer"
			name="customerName"
			autocomplete="organization"
			bind:value={values.customerName}
			disabled={!writable.customerName}
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
			disabled={!writable.status}
			aria-invalid={errors.status ? 'true' : undefined}
			aria-describedby={[
				errors.status ? `${formId}-status-error` : '',
				writable.status ? '' : `${formId}-status-hint`
			]
				.filter(Boolean)
				.join(' ') || undefined}
		>
			{#each ORDER_STATUSES as status (status)}
				<option value={status}>{orderStatusLabel(status)}</option>
			{/each}
		</select>
		{#if errors.status}
			<p id="{formId}-status-error" class="error">{errors.status}</p>
		{/if}
		{#if !writable.status}
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
			disabled={!writable.total}
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
