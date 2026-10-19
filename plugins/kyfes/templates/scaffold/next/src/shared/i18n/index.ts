// Client-safe entry. Server helpers (I18nNamespaces, getTranslations) are in ./server.
export { useTranslations, NextIntlClientProvider } from 'next-intl';
export { useLocale, useFormatters, useHtmlLang, useSwitchLocale } from './hooks';
export { formatDate, formatNumber, formatCurrency, type DateInput } from './format';
export {
  LOCALES,
  DEFAULT_LOCALE,
  TIME_ZONE,
  isLocale,
  type Locale,
  type Messages,
  type NamespaceLoader,
} from './config';
