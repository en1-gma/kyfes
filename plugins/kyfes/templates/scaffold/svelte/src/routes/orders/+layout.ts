import { requireAuth } from '$lib/shared/auth';
import { requirePermission } from '$lib/shared/rbac';
import type { LayoutLoad } from './$types';

/** Every /orders route: authenticated + `read Order`. */
export const load: LayoutLoad = async ({ parent, url }) => {
	const { queryClient } = await parent();
	await requireAuth(queryClient, url);
	await requirePermission(queryClient, 'read', 'Order');
};
