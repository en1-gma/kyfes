import { screen, within } from '@testing-library/react';
import { http as mswHttp, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { errorHandlers } from '@/mocks/handlers';
import { server } from '@/mocks/node';
import { ACTION } from '@/shared/rbac';
import { renderWithProviders } from '@/test/render';
import { ORDER_FIELD, ORDER_STATUS } from '../model/orders.schema';
import { ORDER_SUBJECT } from '../permissions';
import { OrdersTable } from './OrdersTable';

describe('OrdersTable RBAC', () => {
  it('manager sees Edit and Delete on every row', async () => {
    renderWithProviders(<OrdersTable />, { user: 'manager' });
    const table = await screen.findByRole('table');
    expect(within(table).getByRole('columnheader', { name: 'Azioni' })).toBeInTheDocument();
    expect(within(table).getAllByRole('link', { name: /Modifica l'ordine/ })).toHaveLength(20);
    expect(within(table).getAllByRole('button', { name: /Elimina l'ordine/ })).toHaveLength(20);
  });

  it('viewer sees no CRUD actions', async () => {
    renderWithProviders(<OrdersTable />, { user: 'viewer' });
    const table = await screen.findByRole('table');
    expect(within(table).queryByRole('columnheader', { name: 'Azioni' })).not.toBeInTheDocument();
    expect(within(table).queryByRole('link', { name: /Modifica/ })).not.toBeInTheDocument();
    expect(within(table).queryByRole('button', { name: /Elimina/ })).not.toBeInTheDocument();
  });

  it('applies record conditions (update only drafts)', async () => {
    renderWithProviders(<OrdersTable />, {
      rules: [
        { action: ACTION.read, subject: ORDER_SUBJECT },
        {
          action: ACTION.update,
          subject: ORDER_SUBJECT,
          conditions: { [ORDER_FIELD.status]: ORDER_STATUS.draft },
        },
      ],
    });
    const table = await screen.findByRole('table');
    // seed: every 4th order is a draft → 5 of the first 20
    expect(within(table).getAllByRole('link', { name: /Modifica l'ordine/ })).toHaveLength(5);
    expect(within(table).queryByRole('button', { name: /Elimina/ })).not.toBeInTheDocument();
  });

  it('shows a generic error with the correlationId on 5xx', async () => {
    server.use(errorHandlers.ordersServerError);
    renderWithProviders(<OrdersTable />);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Non è stato possibile completare');
    expect(alert).toHaveTextContent('mock-internal-500');
  });

  it('shows the empty state', async () => {
    server.use(
      mswHttp.get('/api/orders', () =>
        HttpResponse.json({ items: [], nextCursor: null, limit: 20 }),
      ),
    );
    renderWithProviders(<OrdersTable />);
    expect(await screen.findByText('Non ci sono ordini.')).toBeInTheDocument();
  });
});
