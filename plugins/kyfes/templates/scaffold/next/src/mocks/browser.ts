import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);

let started: Promise<unknown> | null = null;

/**
 * Started by mocks/MockGate only in development with NEXT_PUBLIC_API_MOCKS=true.
 * Idempotent: React StrictMode runs effects twice in development.
 */
export function startMockWorker(): Promise<unknown> {
  started ??= worker.start({ onUnhandledFrame: 'bypass', quiet: true });
  return started;
}
