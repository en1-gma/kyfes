import { DeferBlockBehavior } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import { useMockUser } from '../../../mocks/handlers';
import { provideTestApp } from '../../../testing/providers';
import { OrdersPageComponent } from './orders-page.component';

async function renderPage() {
  await render(OrdersPageComponent, {
    providers: provideTestApp(),
    deferBlockBehavior: DeferBlockBehavior.Manual,
  });
  // La tabella è caricata (MSW) quando compare il primo ordine.
  await screen.findByRole('link', { name: /Apri ordine ORD-0045/ });
}

describe('OrdersPage — RBAC', () => {
  it('manager: vede Nuovo, Modifica ed Elimina (Elimina solo sugli ordini non spediti)', async () => {
    useMockUser('manager');
    await renderPage();
    expect(await screen.findByRole('link', { name: 'Nuovo ordine' })).toBeTruthy();
    expect(screen.getAllByRole('link', { name: /Modifica ordine/ }).length).toBe(20);
    const deletes = screen.getAllByRole('button', { name: /Elimina ordine/ });
    expect(deletes.length).toBeGreaterThan(0);
    expect(deletes.length).toBeLessThan(20);
  });

  it('viewer: nessuna azione CRUD e nessuna colonna Azioni', async () => {
    useMockUser('viewer');
    await renderPage();
    expect(screen.queryByRole('link', { name: 'Nuovo ordine' })).toBeNull();
    expect(screen.queryAllByRole('link', { name: /Modifica ordine/ })).toHaveLength(0);
    expect(screen.queryAllByRole('button', { name: /Elimina ordine/ })).toHaveLength(0);
    expect(screen.queryByRole('columnheader', { name: 'Azioni' })).toBeNull();
  });
});
