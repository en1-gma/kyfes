'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { ErrorState, Loading } from '@/shared/ui';
import { login, useSession } from './session';

/** Route guard: renders children only with a session, otherwise starts the BFF login. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { data: session, isPending, error, refetch } = useSession();
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const anonymous = !isPending && !error && session === null;

  useEffect(() => {
    if (anonymous) login(search ? `${pathname}?${search}` : pathname);
  }, [anonymous, pathname, search]);

  if (isPending) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (!session) return <Loading messageKey="states.redirecting" />;
  return <>{children}</>;
}
