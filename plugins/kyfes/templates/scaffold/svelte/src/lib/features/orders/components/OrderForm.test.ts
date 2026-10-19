import { screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { sessionKeys } from '$lib/shared/auth';
import { renderWithProviders } from '../../../../mocks/render';
import { seedOrders } from '../../../../mocks/data';
import OrderForm from './OrderForm.svelte';

describe('OrderForm', () => {
	it('validates with Zod and shows translated messages', async () => {
		renderWithProviders(OrderForm, { props: {} });
		await userEvent.click(screen.getByRole('button', { name: 'Crea ordine' }));
		expect(await screen.findByText('Campo obbligatorio.')).toBeInTheDocument();
		expect(screen.getByLabelText('Cliente')).toHaveAttribute('aria-invalid', 'true');
	});

	it('status is read-only without update permission on the field', async () => {
		const order = seedOrders(1)[0];
		const { client } = renderWithProviders(OrderForm, { props: { order }, user: 'viewer' });
		await waitFor(() => expect(client.getQueryData(sessionKeys.me())).toBeDefined());
		await waitFor(() => expect(screen.getByLabelText('Stato')).toBeDisabled());
	});

	it('status is editable for the manager', async () => {
		const order = seedOrders(1)[0];
		renderWithProviders(OrderForm, { props: { order }, user: 'manager' });
		await waitFor(() => expect(screen.getByLabelText('Stato')).toBeEnabled());
	});
});
