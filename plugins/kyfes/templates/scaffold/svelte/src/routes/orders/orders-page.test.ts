import { screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../mocks/render';
import OrdersPage from './+page.svelte';

describe('OrdersPage RBAC', () => {
	it('manager sees the "New order" action', async () => {
		renderWithProviders(OrdersPage, { user: 'manager' });
		expect(await screen.findByRole('link', { name: 'Nuovo ordine' })).toBeInTheDocument();
	});

	it('viewer does not see the "New order" action', async () => {
		renderWithProviders(OrdersPage, { user: 'viewer' });
		await screen.findByText('ORD-0045');
		expect(screen.queryByRole('link', { name: 'Nuovo ordine' })).not.toBeInTheDocument();
	});
});
