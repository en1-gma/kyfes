import { setupWorker } from 'msw/browser';
import type { MockUser } from './data';
import { handlers, useMockUser } from './handlers';

/**
 * Dev only (hooks.client.ts, PUBLIC_API_MOCKS=true). Pick the mock user with
 * `?mockUser=viewer` or `?mockUser=operator` (default manager) or `?mockUser=anonymous`.
 */
export async function startMockWorker(): Promise<void> {
	const requested = new URLSearchParams(window.location.search).get('mockUser');
	const users: Record<string, MockUser | null> = {
		manager: 'manager',
		viewer: 'viewer',
		operator: 'operator',
		anonymous: null
	};
	if (requested && requested in users) useMockUser(users[requested] ?? null);
	const worker = setupWorker(...handlers);
	await worker.start({ onUnhandledFrame: 'bypass', quiet: true });
}
