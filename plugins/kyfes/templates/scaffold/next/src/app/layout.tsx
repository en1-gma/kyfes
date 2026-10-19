import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { COMMON_NS, getLocale, getTranslations, hasExplicitLocale } from '@/shared/i18n/server';
import { AppShell } from './AppShell';
import { Providers } from './providers';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations(COMMON_NS);
  return { title: { default: t('app.title'), template: `%s · ${t('app.title')}` } };
}

/**
 * Root layout. Rendered dynamically (cookies/headers): required by the per-request CSP
 * nonce set in src/proxy.ts, which Next applies to its own scripts automatically.
 */
export default async function RootLayout({ children }: { children: ReactNode }) {
  const [locale, explicitLocale] = await Promise.all([getLocale(), hasExplicitLocale()]);
  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider>
          <Providers explicitLocale={explicitLocale}>
            <AppShell>{children}</AppShell>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
