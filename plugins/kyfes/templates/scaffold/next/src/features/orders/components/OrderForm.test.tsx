import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ACTION } from '@/shared/rbac';
import { renderWithProviders } from '@/test/render';
import { ORDER_FIELD, type Order } from '../model/orders.schema';
import { ORDER_SUBJECT } from '../permissions';
import { OrderForm } from './OrderForm';
import { ORDER_STATUS } from '../constants';

const order: Order = {
  id: '00000000-0000-4000-8000-000000000001',
  number: 'ORD-0001',
  customerName: 'ACME',
  status: ORDER_STATUS.confirmed,
  total: 100,
  createdAt: '2026-01-01T10:00:00.000Z',
};

describe('OrderForm', () => {
  it('validates with Zod and shows translated messages', async () => {
    const onSubmit = vi.fn();
    renderWithProviders(<OrderForm onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole('button', { name: 'Salva ordine' }));
    expect(await screen.findByText('Il cliente è obbligatorio.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('status is editable with field permission', () => {
    renderWithProviders(<OrderForm order={order} onSubmit={vi.fn()} />, { user: 'manager' });
    expect(screen.getByRole('combobox', { name: 'Stato' })).toBeInTheDocument();
  });

  it('status is read-only without update permission on the field', async () => {
    const onSubmit = vi.fn();
    renderWithProviders(<OrderForm order={order} onSubmit={onSubmit} />, {
      rules: [
        { action: ACTION.read, subject: ORDER_SUBJECT },
        {
          action: ACTION.update,
          subject: ORDER_SUBJECT,
          fields: [ORDER_FIELD.customerName, ORDER_FIELD.total],
        },
      ],
    });
    const status = screen.getByRole('textbox', { name: 'Stato' });
    expect(status).toHaveAttribute('readonly');
    expect(status).toHaveValue('Confermato');
    await userEvent.click(screen.getByRole('button', { name: 'Salva ordine' }));
    expect(onSubmit).toHaveBeenCalledWith({ customerName: 'ACME', total: 100 });
  });
});
