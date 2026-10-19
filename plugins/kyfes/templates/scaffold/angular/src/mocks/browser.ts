import { setupWorker } from 'msw/browser';
import { MOCK_USER_KEYS, type MockUserKey } from './data';
import { handlers, useMockUser } from './handlers';

/** Solo sviluppo (`npm run dev:mocks`). Utente simulato: `?mockUser=viewer|operator|manager`. */
export async function startMockWorker(): Promise<void> {
  const user = new URLSearchParams(globalThis.location.search).get('mockUser');
  const known = MOCK_USER_KEYS.find((key): key is MockUserKey => key === user);
  if (known) useMockUser(known);
  await setupWorker(...handlers).start({ onUnhandledFrame: 'bypass', quiet: true });
}
