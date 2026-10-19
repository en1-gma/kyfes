import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { apiError } from '@/mocks/handlers';
import { server } from '@/mocks/node';
import { renderWithProviders } from '@/test/render';
import { OrdersTable } from './OrdersTable';

async function rows() {
  const table = await screen.findByRole('table');
  return within(table).getAllByRole('row').slice(1);
}

describe('OrdersTable — RBAC', () => {
  it('manager sees Edit and Delete on every row', async () => {
    renderWithProviders(<OrdersTable />, { user: 'manager' });
    const body = await rows();
    expect(body).toHaveLength(20);
    expect(screen.getByRole('columnheader', { name: 'Azioni' })).toBeInTheDocument();
    expect(within(body[0]!).getByRole('link', { name: /modifica l'ordine/i })).toBeInTheDocument();
    expect(within(body[0]!).getByRole('button', { name: /elimina l'ordine/i })).toBeInTheDocument();
  });

  it('viewer sees no actions column at all', async () => {
    renderWithProviders(<OrdersTable />, { user: 'viewer' });
    await rows();
    expect(screen.queryByRole('columnheader', { name: 'Azioni' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /modifica l'ordine/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /elimina l'ordine/i })).not.toBeInTheDocument();
  });

  it('operator can edit only draft orders (condition on the record) and never delete', async () => {
    renderWithProviders(<OrdersTable />, { user: 'operator' });
    const body = await rows();
    for (const row of body) {
      const isDraft = within(row).queryByText('Bozza') !== null;
      expect(within(row).queryByRole('link', { name: /modifica l'ordine/i }) !== null).toBe(isDraft);
      expect(within(row).queryByRole('button', { name: /elimina/i })).not.toBeInTheDocument();
    }
  });
});

describe('OrdersTable — data states', () => {
  it('loads the next page with the cursor', async () => {
    const user = userEvent.setup();
    renderWithProviders(<OrdersTable />);
    await rows();
    await user.click(screen.getByRole('button', { name: 'Carica altri' }));
    await waitFor(async () => {
      expect(await rows()).toHaveLength(40);
    });
  });

  it('shows the empty state', async () => {
    server.use(http.get('/api/orders', () => HttpResponse.json({ items: [], nextCursor: null, limit: 20 })));
    renderWithProviders(<OrdersTable />);
    expect(await screen.findByText('Nessun ordine trovato.')).toBeInTheDocument();
  });

  it('shows a generic error with the correlationId', async () => {
    server.use(http.get('/api/orders', () => apiError(500, 'INTERNAL', 'SQL error: secret details')));
    renderWithProviders(<OrdersTable />);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/Codice errore: mock-/);
    expect(alert).not.toHaveTextContent(/SQL/);
  });

  it('shows the not-authorized state on 403', async () => {
    server.use(http.get('/api/orders', () => apiError(403, 'FORBIDDEN', 'No')));
    renderWithProviders(<OrdersTable />);
    expect(await screen.findByRole('heading', { name: 'Accesso non autorizzato' })).toBeInTheDocument();
  });

  it('deletes after confirmation', async () => {
    const user = userEvent.setup();
    renderWithProviders(<OrdersTable />);
    const [first] = await rows();
    const number = within(first!).getAllByRole('cell')[0]!.textContent;
    await user.click(within(first!).getByRole('button', { name: /elimina l'ordine/i }));
    await user.click(screen.getByRole('button', { name: 'Elimina ordine' }));
    await waitFor(() => {
      expect(screen.queryByRole('link', { name: `Apri l'ordine ${number}` })).not.toBeInTheDocument();
    });
  });
});
