'use client';

import { useSyncExternalStore, type ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import {
  COMMON_NS,
  DEFAULT_LOCALE,
  TIME_ZONE,
  isLocale,
  matchAcceptLanguage,
  type Locale,
} from './config';
import commonEn from './locales/en.json';
import commonIt from './locales/it.json';

const COMMON: Record<Locale, Record<string, unknown>> = { it: commonIt, en: commonEn };

function subscribe(): () => void {
  return () => undefined;
}

/** Locale of the page that crashed (<html lang>), then the browser languages. */
function browserLocale(): Locale {
  const lang = document.documentElement.lang;
  if (isLocale(lang)) return lang;
  return matchAcceptLanguage(navigator.languages.join(',')) ?? DEFAULT_LOCALE;
}

/** Client-side locale for screens rendered outside the root layout (global-error). */
export function useStandaloneLocale(): Locale {
  return useSyncExternalStore(subscribe, browserLocale, () => DEFAULT_LOCALE);
}

/**
 * `common` messages without the server request config: global-error replaces the root layout,
 * so the regular NextIntlClientProvider is not there. Both languages are bundled only here.
 */
export function StandaloneI18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return (
    <NextIntlClientProvider
      locale={locale}
      timeZone={TIME_ZONE}
      messages={{ [COMMON_NS]: COMMON[locale] }}
    >
      {children}
    </NextIntlClientProvider>
  );
}
