'use client';

import { isApiError } from '@/shared/api';
import { COMMON_NS, useTranslations } from '@/shared/i18n';
import { Button } from './Button';
import styles from './ui.module.css';

/**
 * Generic message + correlationId (never the raw server/axios error).
 * 403 shows "not authorized" instead, without retry: retrying would fail the same way.
 */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const t = useTranslations(COMMON_NS);
  const correlationId = isApiError(error) ? error.correlationId : undefined;
  const forbidden = isApiError(error) && error.isForbidden;
  return (
    <div className={styles.state} role="alert">
      <strong>{forbidden ? t('errors.forbiddenTitle') : t('errors.title')}</strong>
      <p>{forbidden ? t('errors.forbidden') : t('errors.generic')}</p>
      {correlationId ? (
        <p className={styles.muted}>{t('errors.correlation', { id: correlationId })}</p>
      ) : null}
      {onRetry && !forbidden ? <Button onClick={onRetry}>{t('actions.retry')}</Button> : null}
    </div>
  );
}
