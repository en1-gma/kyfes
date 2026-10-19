import { QueryClient } from '@tanstack/angular-query-experimental';
import { ApiError } from './api-error';

const MAX_RETRIES = 2;

/** Nessun retry sui 4xx (incl. errori di validazione della risposta); al massimo 2 su 5xx/rete. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && (error.isClientError || error.code === 'INVALID_RESPONSE')) {
    return false;
  }
  return failureCount < MAX_RETRIES;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: shouldRetry,
        // I dati gestionali cambiano spesso: si ricarica al ritorno sulla scheda solo se stale.
        refetchOnWindowFocus: true,
      },
      mutations: { retry: false },
    },
  });
}
