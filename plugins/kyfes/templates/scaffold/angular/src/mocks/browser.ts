import { setupWorker } from 'msw/browser';
import type { MockUserKey } from './data';
import { handlers, useMockUser } from './handlers';

/** Solo sviluppo (`npm run dev:mocks`). Utente simulato: `?mockUser=viewer`. */
export async function startMockWorker(): Promise<void> {
  const user = new URLSearchParams(globalThis.location.search).get('mockUser');
  if (user === 'viewer' || user === 'manager') useMockUser(user satisfies MockUserKey);
  await setupWorker(...handlers).start({ onUnhandledFrame: 'bypass', quiet: true });
}
