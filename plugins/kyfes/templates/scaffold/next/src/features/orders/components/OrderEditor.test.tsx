import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http as mswHttp, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { db, setMockUser } from '@/mocks/data';
import { server } from '@/mocks/node';
import { renderWithProviders } from '@/test/render';
import { EditOrder, NewOrder } from './OrderEditor';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

/** Records the JSON body of every write to /api/orders* (then lets the mock handle it). */
function captureBodies() {
  const bodies: unknown[] = [];
  server.events.on('request:start', async ({ request }) => {
    if (request.method === 'POST' || request.method === 'PATCH') {
      bodies.push(await request.clone().json());
    }
  });
  return bodies;
}

afterEach(() => server.events.removeAllListeners());

const draft = () => db.orders.find((o) => o.status === 'draft')!;
const confirmed = () => db.orders.find((o) => o.status === 'confirmed')!;

describe('OrderEditor field permissions (operator)', () => {
  it('create never sends the status', async () => {
    setMockUser('operator');
    const bodies = captureBodies();
    renderWithProviders(<NewOrder />, { user: 'operator' });
    await userEvent.type(screen.getByRole('textbox', { name: 'Cliente' }), 'New Co');
    await userEvent.click(screen.getByRole('button', { name: 'Salva ordine' }));
    await vi.waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toEqual({ customerName: 'New Co', total: 0 });
    expect(bodies[0]).not.toHaveProperty('status');
    await vi.waitFor(() =>
      expect(db.orders[0]).toMatchObject({ customerName: 'New Co', status: 'draft' }),
    );
  });

  it('update of a draft sends only the writable fields', async () => {
    setMockUser('operator');
    const order = draft();
    const bodies = captureBodies();
    renderWithProviders(<EditOrder id={order.id} />, { user: 'operator' });
    const customer = await screen.findByRole('textbox', { name: 'Cliente' });
    await userEvent.clear(customer);
    await userEvent.type(customer, 'Renamed');
    await userEvent.click(screen.getByRole('button', { name: 'Salva ordine' }));
    await vi.waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).not.toHaveProperty('status');
    expect(bodies[0]).toEqual({ customerName: 'Renamed', total: order.total });
  });

  it('shows "not authorized" when the record cannot be updated (not a draft)', async () => {
    setMockUser('operator');
    renderWithProviders(<EditOrder id={confirmed().id} />, { user: 'operator' });
    expect(
      await screen.findByRole('heading', { name: 'Accesso non autorizzato' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Salva ordine' })).not.toBeInTheDocument();
  });

  it('manager can edit any order', async () => {
    renderWithProviders(<EditOrder id={confirmed().id} />, { user: 'manager' });
    expect(await screen.findByRole('combobox', { name: 'Stato' })).toBeInTheDocument();
  });

  it('server fieldErrors land on their fields (translated, never raw)', async () => {
    server.use(
      mswHttp.post('/api/orders', () =>
        HttpResponse.json(
          {
            code: 'VALIDATION_ERROR',
            message: 'Invalid order',
            fieldErrors: { customerName: ['validation.tooLong'], total: ['must be < 1e9'] },
          },
          { status: 422 },
        ),
      ),
    );
    renderWithProviders(<NewOrder />);
    await userEvent.type(screen.getByRole('textbox', { name: 'Cliente' }), 'ACME');
    await userEvent.click(screen.getByRole('button', { name: 'Salva ordine' }));
    expect(await screen.findByText('Il testo è troppo lungo.')).toBeInTheDocument();
    expect(screen.getByText('Valore non valido.')).toBeInTheDocument();
    expect(screen.queryByText('must be < 1e9')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Cliente' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });
});
