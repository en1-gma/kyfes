import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { configureHttp } from '@/shared/api';
import { invalidateSession, login, useCurrentSession } from '@/shared/auth';
import { changeLocale, i18n } from '@/shared/i18n';
import { AbilityProvider } from '@/shared/rbac';

/** Wires the HTTP client callbacks to the app: 401 → BFF login, 403 → reload permissions. */
function HttpBridge({ queryClient }: { queryClient: QueryClient }) {
  useEffect(
    () =>
      configureHttp({
        refreshOnUnauthorized: true,
        onUnauthorized: () => {
          login();
        },
        onForbidden: () => {
          void invalidateSession(queryClient);
        },
      }),
    [queryClient],
  );
  return null;
}

/** Session language wins over the browser one (kyfes §6). */
function SessionLocale() {
  const locale = useCurrentSession()?.locale;
  useEffect(() => {
    void changeLocale(locale);
  }, [locale]);
  return null;
}

export function AppProviders({ queryClient, children }: { queryClient: QueryClient; children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <HttpBridge queryClient={queryClient} />
        <SessionLocale />
        <AbilityProvider>{children}</AbilityProvider>
      </I18nextProvider>
    </QueryClientProvider>
  );
}
