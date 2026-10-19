import type { Locale } from '@shared/i18n';

/** Loader lazy del namespace `orders` (un chunk per lingua). */
export const ORDERS_LOCALE_LOADERS: Record<Locale, () => Promise<unknown>> = {
  it: () => import('./it.json'),
  en: () => import('./en.json'),
};
