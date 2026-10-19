'use client';

import { isApiError } from '@/shared/api';
import { useTranslations } from '@/shared/i18n';
import { Button } from './Button';
import styles from './ui.module.css';

/** Generic error message + correlationId (never the raw server/axios error). */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const t = useTranslations('common');
  const correlationId = isApiError(error) ? error.correlationId : undefined;
  return (
    <div className={styles.state} role="alert">
      <strong>{t('errors.title')}</strong>
      <p>{t('errors.generic')}</p>
      {correlationId ? (
        <p className={styles.muted}>{t('errors.correlation', { id: correlationId })}</p>
      ) : null}
      {onRetry ? <Button onClick={onRetry}>{t('actions.retry')}</Button> : null}
    </div>
  );
}
