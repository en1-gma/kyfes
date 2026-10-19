import { requirePermission } from '$lib/shared/rbac';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
	const { queryClient } = await parent();
	await requirePermission(queryClient, 'create', 'Order');
};
