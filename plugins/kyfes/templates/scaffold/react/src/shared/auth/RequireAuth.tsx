import { useEffect, type ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router';
import { isApiError } from '@/shared/api';
import { useTranslation } from '@/shared/i18n';
import { ErrorState, Spinner } from '@/shared/ui';
import { login, useSession } from './session';

/** Route guard: renders the child routes only with a valid session, otherwise goes to the BFF login. */
export function RequireAuth({ children }: { children?: ReactNode }) {
  const { t } = useTranslation();
  const location = useLocation();
  const { data, error, isPending, refetch } = useSession();
  const unauthenticated = isApiError(error) && error.isUnauthorized;

  useEffect(() => {
    if (unauthenticated) login(`${location.pathname}${location.search}${location.hash}`);
  }, [unauthenticated, location.pathname, location.search, location.hash]);

  if (isPending || unauthenticated) {
    return <Spinner label={unauthenticated ? t('auth.redirecting') : t('state.loading')} />;
  }
  if (!data) {
    return (
      <ErrorState
        error={error}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }
  return children ?? <Outlet />;
}
