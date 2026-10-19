'use client';

import { useEffect, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { getQueryClient, setOnUnauthorized } from '@/shared/api';
import { invalidateSession, useSession } from '@/shared/auth';
import { env } from '@/shared/config/env';
import { isLocale, useHtmlLang, useLocale, useSwitchLocale } from '@/shared/i18n';
import { AbilityProvider } from '@/shared/rbac';

const mocksEnabled = process.env.NODE_ENV === 'development' && env.API_MOCKS;

function Passthrough({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

/**
 * In development with NEXT_PUBLIC_API_MOCKS=true, waits for the MSW worker.
 * Client-only (ssr: false): msw/browser cannot be resolved for the server bundle.
 */
const MockGate = mocksEnabled
  ? dynamic(() => import('@/mocks/MockGate'), { ssr: false })
  : Passthrough;

/** 401 → invalidate the session (RequireAuth then starts the login). */
function SessionWiring() {
  const queryClient = useQueryClient();
  useEffect(() => {
    setOnUnauthorized(() => void invalidateSession(queryClient));
    return () => setOnUnauthorized(null);
  }, [queryClient]);
  return null;
}

/** Initial locale: explicit cookie → session locale → Accept-Language/default (server). */
function LocaleSync({ explicitLocale }: { explicitLocale: boolean }) {
  useHtmlLang();
  const locale = useLocale();
  const { data: session } = useSession();
  const { switchLocale } = useSwitchLocale();
  const sessionLocale = session?.locale;
  useEffect(() => {
    if (!explicitLocale && isLocale(sessionLocale) && sessionLocale !== locale) {
      switchLocale(sessionLocale);
    }
  }, [explicitLocale, sessionLocale, locale, switchLocale]);
  return null;
}

export function Providers({
  children,
  explicitLocale,
}: {
  children: ReactNode;
  explicitLocale: boolean;
}) {
  const [queryClient] = useState(() => {
    const client = getQueryClient({
      // 403: permissions may have changed server-side.
      onForbidden: () => void invalidateSession(client),
    });
    return client;
  });

  return (
    <MockGate>
      <QueryClientProvider client={queryClient}>
        <SessionWiring />
        <LocaleSync explicitLocale={explicitLocale} />
        <AbilityProvider>{children}</AbilityProvider>
      </QueryClientProvider>
    </MockGate>
  );
}
