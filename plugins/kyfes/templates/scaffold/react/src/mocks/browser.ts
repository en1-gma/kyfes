import { setupWorker } from 'msw/browser';
import { setMockUser, type MockUser } from './data';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);

/** Dev only (VITE_API_MOCKS=true): MSW answers /api in the browser. */
export async function startMockWorker(): Promise<void> {
  const user = import.meta.env.VITE_MOCK_USER as string | undefined;
  if (user === 'manager' || user === 'viewer' || user === 'operator') setMockUser(user satisfies MockUser);
  await worker.start({ onUnhandledFrame: 'bypass', quiet: true });
}
