'use client';

import { useTranslations } from '@/shared/i18n';
import styles from './ui.module.css';

export function Spinner() {
  return <span className={styles.spinner} aria-hidden="true" />;
}

/** Loading state; `messageKey` is a key of the `common` namespace. */
export function Loading({ messageKey = 'states.loading' }: { messageKey?: string }) {
  const t = useTranslations('common');
  return (
    <div className={styles.loading} role="status" aria-live="polite">
      <Spinner />
      <span>{t(messageKey)}</span>
    </div>
  );
}
