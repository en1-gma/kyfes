import 'server-only';
import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
import { LOCALE_COOKIE, isLocale, type Locale, type NamespaceLoader } from './config';

export { getLocale, getMessages, getTranslations };

/** Whether the user (or a previous session sync) already chose a locale explicitly. */
export async function hasExplicitLocale(): Promise<boolean> {
  return isLocale((await cookies()).get(LOCALE_COOKIE)?.value);
}

export async function loadNamespaces(
  locale: Locale,
  loaders: readonly NamespaceLoader[],
): Promise<Record<string, unknown>> {
  const entries = await Promise.all(
    loaders.map(async (l) => [l.namespace, await l.load(locale)] as const),
  );
  return Object.fromEntries(entries);
}

/**
 * Lazily adds feature namespaces to the client messages for a route subtree
 * (use it in `src/app/<route>/layout.tsx`). Only that route ships those strings.
 */
export async function I18nNamespaces({
  loaders,
  children,
}: {
  loaders: readonly NamespaceLoader[];
  children: ReactNode;
}) {
  const locale = await getLocale();
  if (!isLocale(locale)) throw new Error(`Unsupported locale ${locale}`);
  const [base, extra] = await Promise.all([getMessages(), loadNamespaces(locale, loaders)]);
  return (
    <NextIntlClientProvider messages={{ ...base, ...extra }}>{children}</NextIntlClientProvider>
  );
}
