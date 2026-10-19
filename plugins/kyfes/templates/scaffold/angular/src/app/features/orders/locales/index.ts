import type { Locale } from '@shared/i18n';
import { ORDERS_FEATURE } from '../model/orders.constants';

/** Namespace i18n della feature: chiavi `orders.*`. */
export const ORDERS_NS = ORDERS_FEATURE;

/** Loader lazy del namespace `orders` (un chunk per lingua). */
export const ORDERS_LOCALE_LOADERS: Record<Locale, () => Promise<unknown>> = {
  it: () => import('./it.json'),
  en: () => import('./en.json'),
};
