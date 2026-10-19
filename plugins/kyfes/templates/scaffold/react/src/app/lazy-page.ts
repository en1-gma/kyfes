import type { ComponentType } from 'react';

type PageModule = { default: ComponentType };

/**
 * Code splitting per route (kyfes §8): `lazy: page(() => import('@/pages/X'))` makes every page
 * a separate chunk loaded by React Router on navigation.
 */
export const page = (load: () => Promise<PageModule>) => async () => ({ Component: (await load()).default });
