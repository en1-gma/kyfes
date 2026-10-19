import { ORDER_ROUTES } from './constants';

/**
 * UI routes of the orders feature (SvelteKit route ids, defined in constants.ts): pages and
 * components pass them to `resolve()` from $app/paths, never a path written by hand.
 */
export const orderPaths = ORDER_ROUTES;
