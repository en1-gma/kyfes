import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import OrdersPage from './page';

vi.mock('@/shared/charts', () => ({ BarChart: () => null, LineChart: () => null }));

describe('OrdersPage RBAC', () => {
  it('manager sees the New button', async () => {
    renderWithProviders(<OrdersPage />, { user: 'manager' });
    expect(await screen.findByRole('link', { name: 'Nuovo ordine' })).toBeInTheDocument();
    expect(await screen.findAllByRole('button', { name: /Elimina l'ordine/ })).not.toHaveLength(0);
  });

  it('viewer does not see the New button', async () => {
    renderWithProviders(<OrdersPage />, { user: 'viewer' });
    await screen.findByRole('table');
    expect(screen.queryByRole('link', { name: 'Nuovo ordine' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Elimina/ })).not.toBeInTheDocument();
  });
});
