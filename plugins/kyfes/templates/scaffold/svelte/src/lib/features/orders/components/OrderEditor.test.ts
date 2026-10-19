import { screen, waitFor } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import { sessionKeys } from '$lib/shared/auth';
import { seedOrders } from '../../../../mocks/data';
import { renderWithProviders } from '../../../../mocks/render';
import OrderEditor from './OrderEditor.svelte';

const [draft, confirmed] = seedOrders(2);

describe('OrderEditor (record-level check)', () => {
	it('operator on a non-draft order sees "not authorized", not the form', async () => {
		if (!confirmed || confirmed.status === 'draft') throw new Error('seed: need a non-draft');
		const { client } = renderWithProviders(OrderEditor, {
			props: { id: confirmed.id },
			user: 'operator'
		});
		await waitFor(() => expect(client.getQueryData(sessionKeys.me())).toBeDefined());
		expect(await screen.findByRole('alert')).toHaveTextContent('Accesso non autorizzato');
		expect(screen.queryByRole('button', { name: 'Salva modifiche' })).not.toBeInTheDocument();
	});

	it('operator on a draft order gets the form', async () => {
		if (!draft) throw new Error('seed: need a draft');
		renderWithProviders(OrderEditor, { props: { id: draft.id }, user: 'operator' });
		expect(await screen.findByRole('button', { name: 'Salva modifiche' })).toBeInTheDocument();
	});
});
