'use client';

import { isApiError } from '@/shared/api';
import { useTranslations } from '@/shared/i18n';
import { StandaloneI18nProvider, useStandaloneLocale } from '@/shared/i18n/standalone';
import { Button } from '@/shared/ui';
import './globals.css';

type GlobalErrorProps = { error: Error & { digest?: string }; reset: () => void };

function GlobalErrorBody({ error, reset }: GlobalErrorProps) {
  const t = useTranslations('common');
  // Reference for support: the backend correlationId, or the digest Next logs server-side.
  const reference = (isApiError(error) ? error.correlationId : undefined) ?? error.digest;
  return (
    <main id="main" className="global-error">
      <div role="alert">
        <h1>{t('errors.title')}</h1>
        <p>{t('errors.generic')}</p>
        {reference ? (
          <p className="global-error__meta">{t('errors.correlation', { id: reference })}</p>
        ) : null}
      </div>
      <Button variant="primary" onClick={reset}>
        {t('actions.retry')}
      </Button>
    </main>
  );
}

/** Last-resort boundary (errors in the root layout): translated, no technical details. */
export default function GlobalError(props: GlobalErrorProps) {
  const locale = useStandaloneLocale();
  return (
    <html lang={locale}>
      <body>
        <StandaloneI18nProvider locale={locale}>
          <GlobalErrorBody {...props} />
        </StandaloneI18nProvider>
      </body>
    </html>
  );
}
