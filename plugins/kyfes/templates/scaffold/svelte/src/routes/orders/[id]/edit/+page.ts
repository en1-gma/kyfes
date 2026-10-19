import { requirePermission } from '$lib/shared/rbac';
import type { PageLoad } from './$types';

/** Type-level check; the record-level condition is applied by the form and by the server. */
export const load: PageLoad = async ({ parent }) => {
	const { queryClient } = await parent();
	await requirePermission(queryClient, 'update', 'Order');
};
