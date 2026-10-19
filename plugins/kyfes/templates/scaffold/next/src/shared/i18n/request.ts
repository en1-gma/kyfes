import { cookies, headers } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { DEFAULT_LOCALE, LOCALE_COOKIE, TIME_ZONE, isLocale, matchAcceptLanguage } from './config';

/**
 * next-intl request config (registered in next.config.ts). No locale in the URL:
 * cookie (explicit choice or session locale) → Accept-Language → DEFAULT_LOCALE.
 * Only the `common` namespace is global; feature namespaces are added per route
 * by <I18nNamespaces> (see ./server.tsx).
 */
export default getRequestConfig(async () => {
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieLocale)
    ? cookieLocale
    : (matchAcceptLanguage((await headers()).get('accept-language')) ?? DEFAULT_LOCALE);

  const common = (await import(`./locales/${locale}.json`)).default;
  return { locale, timeZone: TIME_ZONE, messages: { common } };
});
