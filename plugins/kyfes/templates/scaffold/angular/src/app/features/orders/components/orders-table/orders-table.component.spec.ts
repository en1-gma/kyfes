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
});
