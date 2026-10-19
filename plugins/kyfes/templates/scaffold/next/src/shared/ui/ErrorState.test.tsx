import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/api';
import { renderWithProviders } from '@/test/render';
import { ErrorState } from './ErrorState';

describe('ErrorState', () => {
  it('shows "not authorized" on 403, with the correlationId and no retry', () => {
    const error = new ApiError({
      status: 403,
      code: 'FORBIDDEN',
      message: 'x',
      correlationId: 'c-403',
    });
    renderWithProviders(<ErrorState error={error} onRetry={vi.fn()} />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Accesso non autorizzato');
    expect(alert).toHaveTextContent('Non hai i permessi per eseguire questa operazione.');
    expect(alert).toHaveTextContent('c-403');
    expect(alert).not.toHaveTextContent('Non è stato possibile completare');
    expect(screen.queryByRole('button', { name: 'Riprova' })).not.toBeInTheDocument();
  });

  it('shows the generic message with retry otherwise', () => {
    const error = new ApiError({ status: 500, code: 'INTERNAL', message: 'stack trace…' });
    renderWithProviders(<ErrorState error={error} onRetry={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Non è stato possibile completare');
    expect(screen.getByRole('alert')).not.toHaveTextContent('stack trace');
    expect(screen.getByRole('button', { name: 'Riprova' })).toBeInTheDocument();
  });
});
