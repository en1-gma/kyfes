'use client';

import Link from 'next/link';
import { useTranslations } from '@/shared/i18n';
import { buttonClassName } from './Button';
import styles from './ui.module.css';

function StatusPage({ titleKey, descriptionKey }: { titleKey: string; descriptionKey: string }) {
  const t = useTranslations('common');
  return (
    <section className={styles.state}>
      <h1>{t(titleKey)}</h1>
      <p>{t(descriptionKey)}</p>
      <Link href="/" className={buttonClassName()}>
        {t('actions.goHome')}
      </Link>
    </section>
  );
}

/** 403: shown by route guards when the permission is missing. */
export function ForbiddenPage() {
  return (
    <StatusPage titleKey="errors.forbiddenTitle" descriptionKey="errors.forbiddenDescription" />
  );
}

export function NotFoundPage() {
  return <StatusPage titleKey="errors.notFoundTitle" descriptionKey="errors.notFoundDescription" />;
}
