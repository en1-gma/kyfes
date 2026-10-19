import { useTranslation } from 'react-i18next';
import { SUPPORTED_LOCALES, type Locale } from '@/shared/config';
import { changeLocale, toSupportedLocale } from './i18n';

/** Current language + setter for the language switcher. */
export function useLocale(): {
  locale: Locale;
  locales: readonly Locale[];
  setLocale: (next: Locale) => Promise<void>;
} {
  const { i18n } = useTranslation();
  const locale = toSupportedLocale(i18n.resolvedLanguage) ?? SUPPORTED_LOCALES[0];
  return { locale, locales: SUPPORTED_LOCALES, setLocale: changeLocale };
}
