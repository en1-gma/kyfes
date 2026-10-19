import { Suspense } from 'react';
import { NavLink, Outlet } from 'react-router';
import { ORDER_SUBJECT, orderPaths } from '@/features/orders';
import { useCurrentSession, useLogout } from '@/shared/auth';
import { useLocale, useTranslation } from '@/shared/i18n';
import { ACTIONS, Can } from '@/shared/rbac';
import { Button, Spinner } from '@/shared/ui';

export function AppLayout() {
  const { t } = useTranslation();
  const session = useCurrentSession();
  const logout = useLogout();
  const { locale, locales, setLocale } = useLocale();

  return (
    <div className="layout">
      <a className="skip-link" href="#main">
        {t('app.skipToContent')}
      </a>
      <header className="layout__header">
        <span className="layout__brand">{t('app.name')}</span>
        <nav aria-label={t('nav.main')}>
          <ul className="nav">
            <Can I={ACTIONS.read} a={ORDER_SUBJECT}>
              <li>
                <NavLink to={orderPaths.list}>{t('nav.orders')}</NavLink>
              </li>
            </Can>
          </ul>
        </nav>
        <div className="layout__user">
          <label className="field field--inline">
            <span>{t('language.label')}</span>
            <select
              value={locale}
              onChange={(e) => {
                const next = locales.find((l) => l === e.target.value);
                if (next) void setLocale(next);
              }}
            >
              {locales.map((l) => (
                <option key={l} value={l}>
                  {t(`language.${l}`)}
                </option>
              ))}
            </select>
          </label>
          {session && <span className="muted">{t('auth.signedInAs', { name: session.user.name })}</span>}
          <Button
            variant="ghost"
            onClick={() => {
              void logout();
            }}
          >
            {t('auth.logout')}
          </Button>
        </div>
      </header>
      <main id="main" className="layout__main" tabIndex={-1}>
        <Suspense fallback={<Spinner />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
