'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLogout, useSession } from '@/shared/auth';
import { LOCALES, isLocale, useLocale, useSwitchLocale, useTranslations } from '@/shared/i18n';
import { useAbility, type SubjectName } from '@/shared/rbac';
import { Button } from '@/shared/ui';
import styles from './app.module.css';

interface NavItem {
  href: string;
  labelKey: string;
  subject: SubjectName;
}

/** Menu entries: each one is visible only with `read` on its subject. */
const NAV: readonly NavItem[] = [{ href: '/orders', labelKey: 'nav.orders', subject: 'Order' }];

export function AppShell({ children }: { children: ReactNode }) {
  const t = useTranslations('common');
  const ability = useAbility();
  const pathname = usePathname();
  const locale = useLocale();
  const { switchLocale, isPending } = useSwitchLocale();
  const { data: session } = useSession();
  const logout = useLogout();

  return (
    <>
      <a href="#main" className="skip-link">
        {t('app.skipToContent')}
      </a>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          {t('app.title')}
        </Link>
        <nav aria-label={t('nav.main')}>
          <ul className={styles.nav}>
            {NAV.filter((item) => ability.can('read', item.subject)).map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={pathname.startsWith(item.href) ? 'page' : undefined}
                >
                  {t(item.labelKey)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className={styles.tools}>
          <label>
            <span className="visually-hidden">{t('nav.language')}</span>
            <select
              value={locale}
              disabled={isPending}
              onChange={(e) => {
                if (isLocale(e.target.value)) switchLocale(e.target.value);
              }}
            >
              {LOCALES.map((l) => (
                <option key={l} value={l} lang={l}>
                  {t(`locales.${l}`)}
                </option>
              ))}
            </select>
          </label>
          {session ? <Button onClick={() => void logout()}>{t('nav.logout')}</Button> : null}
        </div>
      </header>
      <main id="main" className={styles.main}>
        {children}
      </main>
    </>
  );
}
