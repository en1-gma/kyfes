import { ORDER_SUBJECT } from '$lib/features/orders';
import { Action, requirePermission } from '$lib/shared/rbac';
import type { PageLoad } from './$types';

/**
 * Type-level check here (no record yet); the record-level condition is checked by OrderEditor
 * once the order is loaded (not authorized → no form), and by the server.
 */
export const load: PageLoad = async ({ parent }) => {
	const { queryClient } = await parent();
	await requirePermission(queryClient, Action.Update, ORDER_SUBJECT);
};
