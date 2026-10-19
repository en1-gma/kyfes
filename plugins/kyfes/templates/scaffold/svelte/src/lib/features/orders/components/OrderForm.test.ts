import { screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import type { ComponentProps } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sessionKeys } from '$lib/shared/auth';
import { changeLocale } from '$lib/shared/i18n';
import { renderWithProviders } from '../../../../mocks/render';
import { seedOrders, type MockUser } from '../../../../mocks/data';
import { server } from '../../../../mocks/node';
import OrderForm from './OrderForm.svelte';

type OrderFormProps = ComponentProps<typeof OrderForm>;

/** Records the body of the matching request, then lets the mock backend answer. */
function captureBody(method: 'post' | 'patch', path: string) {
	const bodies: unknown[] = [];
	server.use(
		http[method](path, async ({ request }) => {
			bodies.push(await request.clone().json());
		})
	);
	return bodies;
}

/** Fields follow the session's field permissions: wait for it before typing. */
async function renderForm(props: OrderFormProps, user: MockUser = 'manager') {
	const result = renderWithProviders(OrderForm, { props, user });
	await waitFor(() => expect(result.client.getQueryData(sessionKeys.me())).toBeDefined());
	return result;
}

afterEach(() => changeLocale('it'));

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

	it('operator: create sends only the writable fields (no status)', async () => {
		const bodies = captureBody('post', '/api/orders');
		const onsaved = vi.fn();
		await renderForm({ onsaved }, 'operator');
		await waitFor(() => expect(screen.getByLabelText('Stato')).toBeDisabled());
		await userEvent.type(screen.getByLabelText('Cliente'), 'Op Srl');
		await userEvent.type(screen.getByLabelText('Totale'), '10');
		await userEvent.click(screen.getByRole('button', { name: 'Crea ordine' }));
		await waitFor(() => expect(onsaved).toHaveBeenCalledTimes(1));
		expect(bodies).toEqual([{ customerName: 'Op Srl', total: 10 }]);
	});

	it('operator: update of a draft sends a PATCH without status', async () => {
		const order = seedOrders(1)[0];
		if (order?.status !== 'draft') throw new Error('seed: the first order must be a draft');
		const bodies = captureBody('patch', '/api/orders/:id');
		const onsaved = vi.fn();
		await renderForm({ order, onsaved }, 'operator');
		await userEvent.clear(screen.getByLabelText('Totale'));
		await userEvent.type(screen.getByLabelText('Totale'), '77');
		await userEvent.click(screen.getByRole('button', { name: 'Salva modifiche' }));
		await waitFor(() => expect(onsaved).toHaveBeenCalledTimes(1));
		expect(bodies).toEqual([{ customerName: order.customerName, total: 77 }]);
	});

	it('maps 422 fieldErrors onto the fields, without the generic error', async () => {
		server.use(
			http.post('/api/orders', () =>
				HttpResponse.json(
					{
						code: 'VALIDATION_ERROR',
						message: 'Invalid',
						fieldErrors: { customerName: ['tooLong'] }
					},
					{ status: 422 }
				)
			)
		);
		await renderForm({});
		await userEvent.type(screen.getByLabelText('Cliente'), 'Rossi');
		await userEvent.type(screen.getByLabelText('Totale'), '5');
		await userEvent.click(screen.getByRole('button', { name: 'Crea ordine' }));
		expect(await screen.findByText('Testo troppo lungo.')).toBeInTheDocument();
		expect(screen.getByLabelText('Cliente')).toHaveAttribute('aria-invalid', 'true');
		expect(screen.queryByRole('alert')).not.toBeInTheDocument();
	});

	it('shows the generic error (no unhandled rejection) on a server error', async () => {
		server.use(
			http.post('/api/orders', () =>
				HttpResponse.json({ code: 'INTERNAL', message: 'Boom' }, { status: 500 })
			)
		);
		const onsaved = vi.fn();
		await renderForm({ onsaved });
		await userEvent.type(screen.getByLabelText('Cliente'), 'Rossi');
		await userEvent.type(screen.getByLabelText('Totale'), '5');
		await userEvent.click(screen.getByRole('button', { name: 'Crea ordine' }));
		expect(await screen.findByRole('alert')).toHaveTextContent('Si è verificato un errore');
		expect(onsaved).not.toHaveBeenCalled();
	});

	it('keeps the draft when the language changes (no remount)', async () => {
		await renderForm({});
		await userEvent.type(screen.getByLabelText('Cliente'), 'Bozza Srl');
		changeLocale('en');
		expect(await screen.findByLabelText('Customer')).toHaveValue('Bozza Srl');
		expect(screen.getByRole('button', { name: 'Create order' })).toBeInTheDocument();
	});
});
