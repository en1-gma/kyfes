import { error } from '@sveltejs/kit';
import type { QueryClient } from '@tanstack/svelte-query';
import { sessionQueryOptions } from '$lib/shared/auth';
import { buildAbility } from './ability';
import type { Actions, SubjectType } from './subjects';

/**
 * Route guard for +page.ts / +layout.ts load functions: without permission the
 * route renders the 403 page (+error.svelte), never a silent redirect.
 */
export async function requirePermission(
	queryClient: QueryClient,
	action: Actions,
	subjectType: SubjectType
): Promise<void> {
	// fetchQuery, not ensureQueryData: after a 403 the session query is invalidated and the
	// permissions must be read fresh, not from the cache (it still returns cached data otherwise).
	const session = await queryClient.fetchQuery(sessionQueryOptions());
	if (!buildAbility(session.rules).can(action, subjectType)) {
		error(403, 'Forbidden', { code: 'FORBIDDEN' });
	}
}
