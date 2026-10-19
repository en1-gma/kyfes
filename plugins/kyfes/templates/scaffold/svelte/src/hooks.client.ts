import type { ClientInit } from '@sveltejs/kit/hooks';
import { dev } from '$app/env';
import { env } from '$lib/shared/config/env';

/** In development, with PUBLIC_API_MOCKS=true, /api is served by MSW in the browser. */
export const init: ClientInit = async () => {
	if (dev && env.API_MOCKS) {
		const { startMockWorker } = await import('./mocks/browser');
		await startMockWorker();
	}
};
