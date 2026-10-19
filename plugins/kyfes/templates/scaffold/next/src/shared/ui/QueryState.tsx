'use client';

import type { ReactNode } from 'react';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { Loading } from './Loading';

export interface QueryStateProps {
  /** The fields of a TanStack Query result used to pick the state to render. */
  query: { isPending: boolean; error: unknown; refetch: () => Promise<unknown> };
  isEmpty?: boolean;
  /** Already translated; defaults to common.states.empty. */
  emptyMessage?: string;
  children: ReactNode;
}

/** Loading → error (with retry) → empty → content: the same sequence for every query of the UI. */
export function QueryState({ query, isEmpty = false, emptyMessage, children }: QueryStateProps) {
  if (query.isPending) return <Loading />;
  if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  if (isEmpty) return <EmptyState message={emptyMessage} />;
  return <>{children}</>;
}
