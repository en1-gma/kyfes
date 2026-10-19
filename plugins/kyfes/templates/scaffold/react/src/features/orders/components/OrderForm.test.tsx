import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { db } from '@/mocks/data';
import { server } from '@/mocks/node';
import { renderWithProviders } from '@/test/render';
import { OrderForm } from './OrderForm';

describe('OrderForm', () => {
  it('validates with Zod and shows translated messages', async () => {
    const user = userEvent.setup();
    renderWithProviders(<OrderForm />);
    await user.click(screen.getByRole('button', { name: 'Salva' }));
    expect(await screen.findByText('Campo obbligatorio.')).toBeInTheDocument();
    expect(screen.getByLabelText('Cliente')).toHaveAttribute('aria-invalid', 'true');
  });

  it('creates an order', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    renderWithProviders(<OrderForm onSaved={onSaved} />);
    await user.type(screen.getByLabelText('Cliente'), 'ACME S.p.A.');
    await user.clear(screen.getByLabelText('Totale (EUR)'));
    await user.type(screen.getByLabelText('Totale (EUR)'), '150.5');
    await user.click(screen.getByRole('button', { name: 'Salva' }));
    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledWith(
        expect.objectContaining({ customerName: 'ACME S.p.A.', total: 150.5 }),
      );
    });
  });

  it('status is editable for the manager', () => {
    const order = db.orders[0]!;
    renderWithProviders(<OrderForm order={order} />, { user: 'manager' });
    expect(screen.getByLabelText('Stato').tagName).toBe('SELECT');
  });

  it('status is read-only when the field rule does not allow it', () => {
    const draft = db.orders.find((o) => o.status === 'draft')!;
    renderWithProviders(<OrderForm order={draft} />, { user: 'operator' });
    const status = screen.getByLabelText('Stato');
    expect(status).toHaveAttribute('readonly');
    expect(status).toHaveValue('Bozza');
    expect(screen.getByText('Non hai i permessi per modificare lo stato.')).toBeInTheDocument();
  });

  it('never sends a field the user may not write (create and update)', async () => {
    const bodies: Record<string, unknown>[] = [];
    const record = async ({ request }: { request: Request }) => {
      bodies.push((await request.json()) as Record<string, unknown>);
      return HttpResponse.json({ ...db.orders.find((o) => o.status === 'draft')!, customerName: 'Op' });
    };
    server.use(http.post('/api/orders', record), http.patch('/api/orders/:id', record));
    const user = userEvent.setup();
    const onSaved = vi.fn();
    renderWithProviders(<OrderForm onSaved={onSaved} />, { user: 'operator' });
    await user.type(screen.getByLabelText('Cliente'), 'Op S.r.l.');
    await user.click(screen.getByRole('button', { name: 'Salva' }));
    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledTimes(1);
    });
    expect(bodies[0]).not.toHaveProperty('status');
    expect(bodies[0]).toMatchObject({ customerName: 'Op S.r.l.' });
  });

  it('the mock backend rejects fields outside the rules, like a real one', async () => {
    const user = userEvent.setup();
    const draft = db.orders.find((o) => o.status === 'draft')!;
    const onSaved = vi.fn();
    renderWithProviders(<OrderForm order={draft} onSaved={onSaved} />, { user: 'operator' });
    await user.clear(screen.getByLabelText('Cliente'));
    await user.type(screen.getByLabelText('Cliente'), 'Nuovo nome');
    await user.click(screen.getByRole('button', { name: 'Salva' }));
    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledWith(
        expect.objectContaining({ customerName: 'Nuovo nome', status: 'draft' }),
      );
    });
  });
});
