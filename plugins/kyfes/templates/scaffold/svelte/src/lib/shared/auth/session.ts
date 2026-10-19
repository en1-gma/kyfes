import { createQuery, queryOptions, type QueryClient } from '@tanstack/svelte-query';
import { http } from '$lib/shared/api';
import { SessionSchema, type Session } from './session.schema';

export const sessionKeys = {
	all: ['session'] as const,
	me: () => [...sessionKeys.all, 'me'] as const
};

export async function fetchSession(): Promise<Session> {
	const { data } = await http.get<unknown>('/auth/me');
	return SessionSchema.parse(data);
}

export function sessionQueryOptions() {
	return queryOptions({
		queryKey: sessionKeys.me(),
		queryFn: fetchSession,
		staleTime: 5 * 60_000
	});
}

/** Reactive session for components: `const session = useSession(); session.data?.user`. */
export function useSession() {
	return createQuery(() => sessionQueryOptions());
}

export function invalidateSession(queryClient: QueryClient): Promise<void> {
	return queryClient.invalidateQueries({ queryKey: sessionKeys.all });
}
