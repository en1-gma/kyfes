import { QueryClient } from '@tanstack/angular-query-experimental';
import { API_ERROR_CODE, ApiError } from './api-error';

const MAX_RETRIES = 2;

/**
 * Retry (al massimo 2) solo per ApiError di rete/timeout (status 0) o 5xx. Mai sui 4xx, sulle risposte
 * che non rispettano lo schema (INVALID_RESPONSE), sugli errori Zod né su altri errori non HTTP.
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (!(error instanceof ApiError) || error.code === API_ERROR_CODE.invalidResponse) return false;
  const transient = error.status === 0 || error.status >= 500;
  return transient && failureCount < MAX_RETRIES;
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
