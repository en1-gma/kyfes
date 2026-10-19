import { QueryClient } from '@tanstack/svelte-query';
import { describe, expect, it } from 'vitest';
import { invalidateSession, sessionKeys } from '$lib/shared/auth';
import { SESSIONS } from '../../../mocks/data';
import { useMockUser } from '../../../mocks/handlers';
import { requirePermission } from './guard';

describe('requirePermission', () => {
	it('uses the cached session while it is fresh', async () => {
		const client = new QueryClient();
		client.setQueryData(sessionKeys.me(), SESSIONS.manager);
		useMockUser('viewer');
		await expect(requirePermission(client, 'update', 'Order')).resolves.toBeUndefined();
	});

	it('reads fresh permissions once the session is invalidated (e.g. after a 403)', async () => {
		const client = new QueryClient();
		client.setQueryData(sessionKeys.me(), SESSIONS.manager);
		useMockUser('viewer');
		await invalidateSession(client);
		await expect(requirePermission(client, 'update', 'Order')).rejects.toMatchObject({
			status: 403
		});
	});
});
