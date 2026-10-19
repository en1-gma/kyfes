import { screen, waitFor } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import { errorHandlers } from '../../../../mocks/handlers';
import { server } from '../../../../mocks/node';
import { renderWithProviders } from '../../../../mocks/render';
import OrdersTable from './OrdersTable.svelte';

describe('OrdersTable RBAC', () => {
	it('manager (manage Order) sees Edit and Delete on every row', async () => {
		renderWithProviders(OrdersTable, { user: 'manager' });
		await screen.findByText('ORD-0045');
		await waitFor(() =>
			expect(screen.getAllByRole('link', { name: /Modifica l'ordine/ })).toHaveLength(20)
		);
		expect(screen.getAllByRole('button', { name: /Elimina l'ordine/ })).toHaveLength(20);
		expect(screen.getByRole('columnheader', { name: 'Azioni' })).toBeInTheDocument();
	});

	it('viewer (read Order) sees the data but no actions', async () => {
		renderWithProviders(OrdersTable, { user: 'viewer' });
		await screen.findByText('ORD-0045');
		expect(screen.queryByRole('link', { name: /Modifica l'ordine/ })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /Elimina l'ordine/ })).not.toBeInTheDocument();
		expect(screen.queryByRole('columnheader', { name: 'Azioni' })).not.toBeInTheDocument();
	});

	it('shows a generic error with the correlationId on 500', async () => {
		server.use(errorHandlers.ordersServerError);
		renderWithProviders(OrdersTable);
		const alert = await screen.findByRole('alert');
		expect(alert).toHaveTextContent('Si è verificato un errore');
		expect(alert).toHaveTextContent(/mock-\d+/);
		expect(alert).not.toHaveTextContent('Boom');
	});
});
