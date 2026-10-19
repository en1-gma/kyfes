'use client';

import type { ReactNode } from 'react';
import { useTranslations } from '@/shared/i18n';
import styles from './ui.module.css';

/** Empty state; `message` must already be translated (defaults to common.states.empty). */
export function EmptyState({ message, action }: { message?: string; action?: ReactNode }) {
  const t = useTranslations('common');
  return (
    <div className={styles.state}>
      <p className={styles.muted}>{message ?? t('states.empty')}</p>
      {action}
    </div>
  );
}
