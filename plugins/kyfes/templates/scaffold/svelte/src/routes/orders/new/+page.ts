import { ORDER_SUBJECT } from '$lib/features/orders';
import { Action, requirePermission } from '$lib/shared/rbac';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
	const { queryClient } = await parent();
	await requirePermission(queryClient, Action.Create, ORDER_SUBJECT);
};
