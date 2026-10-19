import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test/render';
import OrdersPage from './OrdersPage';

describe('OrdersPage — RBAC', () => {
  it('manager sees New, Edit and Delete', async () => {
    renderWithProviders(<OrdersPage />, { user: 'manager' });
    expect(await screen.findAllByRole('link', { name: /modifica l'ordine/i })).not.toHaveLength(0);
    expect(screen.getByRole('link', { name: 'Nuovo ordine' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /elimina l'ordine/i })).not.toHaveLength(0);
  });

  it('viewer sees the list but no New, Edit or Delete', async () => {
    renderWithProviders(<OrdersPage />, { user: 'viewer' });
    expect(await screen.findAllByRole('link', { name: /apri l'ordine/i })).not.toHaveLength(0);
    expect(screen.queryByRole('link', { name: 'Nuovo ordine' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /modifica l'ordine/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /elimina l'ordine/i })).not.toBeInTheDocument();
  });

  it('renders the accessible chart with its data table', async () => {
    renderWithProviders(<OrdersPage />);
    expect(await screen.findByRole('img', { name: 'Totale ordini per mese' })).toBeInTheDocument();
    expect(screen.getByText('Mostra i dati del grafico')).toBeInTheDocument();
  });
});
