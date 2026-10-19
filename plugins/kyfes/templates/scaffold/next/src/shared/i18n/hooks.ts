'use client';

import { useCallback, useEffect, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale as useIntlLocale } from 'next-intl';
import { setLocaleAction } from './actions';
import { isLocale, DEFAULT_LOCALE, type Locale } from './config';
import { formatCurrency, formatDate, formatNumber, type DateInput } from './format';

export function useLocale(): Locale {
  const locale = useIntlLocale();
  return isLocale(locale) ? locale : DEFAULT_LOCALE;
}

/** Intl formatters bound to the current locale. */
export function useFormatters() {
  const locale = useLocale();
  return useMemo(
    () => ({
      locale,
      formatDate: (v: DateInput, o?: Intl.DateTimeFormatOptions) => formatDate(v, locale, o),
      formatNumber: (v: number, o?: Intl.NumberFormatOptions) => formatNumber(v, locale, o),
      formatCurrency: (v: number, currency?: string) => formatCurrency(v, locale, currency),
    }),
    [locale],
  );
}

/** Keeps <html lang> in sync with the active locale. */
export function useHtmlLang(): void {
  const locale = useLocale();
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
}

/** Switches locale: cookie via server action, then re-render of server components. */
export function useSwitchLocale() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const switchLocale = useCallback(
    (locale: Locale) => {
      startTransition(async () => {
        await setLocaleAction(locale);
        document.documentElement.lang = locale;
        router.refresh();
      });
    },
    [router],
  );
  return { switchLocale, isPending };
}
