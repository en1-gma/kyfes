import { render, screen } from '@testing-library/angular';
import { errorHandlers } from '../../../../../mocks/handlers';
import { server } from '../../../../../mocks/node';
import { provideTestApp } from '../../../../../testing/providers';
import { OrdersTableComponent } from './orders-table.component';

describe('OrdersTable — stati', () => {
  it('errore 5xx: messaggio generico con correlationId, nessun dettaglio tecnico', async () => {
    server.use(errorHandlers.ordersServerError);
    await render(OrdersTableComponent, { providers: provideTestApp() });
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Si è verificato un errore');
    expect(alert.textContent).toMatch(/Codice di riferimento: mock-500-\d+/);
    expect(alert.textContent).not.toContain('Boom');
  });

  it('errore 403: messaggio specifico "non autorizzato", non quello generico', async () => {
    server.use(errorHandlers.ordersForbidden);
    await render(OrdersTableComponent, { providers: provideTestApp() });
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Non hai i permessi per questa operazione.');
    expect(alert.textContent).not.toContain('Si è verificato un errore');
  });

  it('lista: contatore annunciato e "carica altri" finché c\'è il cursore successivo', async () => {
    await render(OrdersTableComponent, { providers: provideTestApp() });
    expect(await screen.findByText('Ordini caricati: 20')).toBeTruthy();
    expect(screen.getByText('Ordini caricati: 20').getAttribute('aria-live')).toBe('polite');
    expect(screen.getByRole('button', { name: 'Carica altri ordini' })).toBeTruthy();
  });
});
