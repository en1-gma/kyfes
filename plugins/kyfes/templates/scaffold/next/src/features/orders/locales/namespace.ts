import type { Locale, NamespaceLoader } from '@/shared/i18n';
import { ORDERS_NS } from '../constants';

/** i18n namespace of the orders feature: `useTranslations(ORDERS_NS)`. */
export { ORDERS_NS };

const loaders: Record<Locale, () => Promise<{ default: Record<string, unknown> }>> = {
  it: () => import('./it.json'),
  en: () => import('./en.json'),
};

/** `orders` namespace, loaded lazily per route (see shared/i18n I18nNamespaces). */
export const ordersMessages: NamespaceLoader = {
  namespace: ORDERS_NS,
  load: async (locale) => (await loaders[locale]()).default,
};
