import { TestBed } from '@angular/core/testing';
import { QueryClient } from '@tanstack/angular-query-experimental';
import { fireEvent, render, screen, waitFor } from '@testing-library/angular';
import { http } from 'msw';
import { errorResponse, useMockUser } from '../../../../../mocks/handlers';
import { server } from '../../../../../mocks/node';
import { provideTestApp } from '../../../../../testing/providers';
import { orderKeys } from '../../api/orders.queries';
import type { Order } from '../../model/orders.schema';
import { OrderFormComponent } from './order-form.component';

// Dal seed dei mock: i % 4 → draft, confirmed, shipped, cancelled.
const DRAFT_ID = '00000000-0000-4000-8000-000000000004';
const SHIPPED_ID = '00000000-0000-4000-8000-000000000003';

/** Corpi JSON inviati al mock (il resolver non risponde: la richiesta prosegue verso gli handler). */
function captureBodies(method: 'post' | 'patch', path: string): unknown[] {
  const bodies: unknown[] = [];
  server.use(
    http[method](path, async ({ request }) => {
      bodies.push(await request.clone().json());
    }),
  );
  return bodies;
}

async function renderForm(orderId?: string) {
  const view = await render(OrderFormComponent, {
    providers: provideTestApp(),
    ...(orderId ? { inputs: { orderId } } : {}),
  });
  return view;
}

describe('OrderForm — permessi per campo e sul record', () => {
  it('operator in creazione: il corpo non contiene status', async () => {
    useMockUser('operator');
    const bodies = captureBodies('post', '/api/orders');
    const saved = vi.fn();
    const { fixture } = await renderForm();
    fixture.componentInstance.saved.subscribe(saved);

    // Permessi caricati dalla sessione: cliente scrivibile, stato no.
    await waitFor(() => expect((screen.getByLabelText('Cliente') as HTMLInputElement).disabled).toBe(false));
    expect((screen.getByLabelText('Stato') as HTMLSelectElement).disabled).toBe(true);
    fireEvent.input(screen.getByLabelText('Cliente'), { target: { value: 'ACME S.r.l.' } });
    fireEvent.input(screen.getByLabelText('Totale (EUR)'), { target: { value: '120.5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crea ordine' }));

    await waitFor(() => expect(saved).toHaveBeenCalledTimes(1));
    expect(bodies).toEqual([{ customerName: 'ACME S.r.l.', total: 120.5 }]);
    expect(saved.mock.calls[0]?.[0]).toMatchObject({ status: 'draft' });
  });

  it('operator in modifica di una bozza: PATCH senza status', async () => {
    useMockUser('operator');
    const bodies = captureBodies('patch', `/api/orders/${DRAFT_ID}`);
    const saved = vi.fn();
    const { fixture } = await renderForm(DRAFT_ID);
    fixture.componentInstance.saved.subscribe(saved);

    const customer = (await screen.findByLabelText('Cliente')) as HTMLInputElement;
    await waitFor(() => expect(customer.value).not.toBe(''));
    await waitFor(() => expect(customer.disabled).toBe(false));
    expect((screen.getByLabelText('Stato') as HTMLSelectElement).disabled).toBe(true);
    fireEvent.input(customer, { target: { value: 'Nuovo Cliente' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salva modifiche' }));

    await waitFor(() => expect(saved).toHaveBeenCalledTimes(1));
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).not.toHaveProperty('status');
    expect(bodies[0]).toMatchObject({ customerName: 'Nuovo Cliente' });
  });

  it('operator su un ordine non in bozza: stato "non autorizzato", nessun form', async () => {
    useMockUser('operator');
    await renderForm(SHIPPED_ID);
    expect(await screen.findByText('Accesso negato')).toBeTruthy();
    expect(screen.queryByRole('form')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Salva modifiche' })).toBeNull();
  });

  it('i fieldErrors del server finiscono sui campi, senza messaggio generico', async () => {
    useMockUser('manager');
    server.use(
      http.post('/api/orders', () =>
        errorResponse(400, 'VALIDATION_ERROR', 'Invalid input', {
          fieldErrors: { customerName: ['orders.form.errors.customerTooLong'], total: ['Too big'] },
        }),
      ),
    );
    await renderForm();
    await waitFor(() => expect((screen.getByLabelText('Stato') as HTMLSelectElement).disabled).toBe(false));
    fireEvent.input(screen.getByLabelText('Cliente'), { target: { value: 'ACME' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crea ordine' }));

    expect(await screen.findByText('Il nome del cliente è troppo lungo.')).toBeTruthy();
    // Messaggio non riconosciuto come chiave → errore di campo generico tradotto.
    expect(screen.getByText('Valore non valido')).toBeTruthy();
    expect(screen.getByLabelText('Cliente').getAttribute('aria-invalid')).toBe('true');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('un fieldError su un campo sconosciuto mostra anche il messaggio generico', async () => {
    useMockUser('manager');
    server.use(
      http.post('/api/orders', () =>
        errorResponse(400, 'VALIDATION_ERROR', 'Invalid input', { fieldErrors: { currency: ['bad'] } }),
      ),
    );
    await renderForm();
    await waitFor(() => expect((screen.getByLabelText('Stato') as HTMLSelectElement).disabled).toBe(false));
    fireEvent.input(screen.getByLabelText('Cliente'), { target: { value: 'ACME' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crea ordine' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Si è verificato un errore');
  });

  it('un refetch in background non sovrascrive le modifiche in corso', async () => {
    useMockUser('manager');
    await renderForm(DRAFT_ID);
    const customer = (await screen.findByLabelText('Cliente')) as HTMLInputElement;
    await waitFor(() => expect(customer.value).not.toBe(''));
    fireEvent.input(customer, { target: { value: 'Bozza utente' } });

    const queryClient = TestBed.inject(QueryClient);
    queryClient.setQueryData<Order>(orderKeys.detail(DRAFT_ID), (order) =>
      order ? { ...order, customerName: 'Dal server' } : order,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(customer.value).toBe('Bozza utente');
  });
});
