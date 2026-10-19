/**
 * UI routes of the orders feature (SvelteKit route ids): pages and components pass them to
 * `resolve()` from $app/paths, never a path written by hand.
 */
export const orderPaths = {
	list: '/orders',
	create: '/orders/new',
	detail: '/orders/[id]',
	edit: '/orders/[id]/edit'
} as const;
