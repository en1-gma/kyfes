import type { ReactNode } from 'react';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { Spinner } from './Spinner';

interface QueryStateProps {
  /** The fields of a TanStack Query result used to pick the state to render. */
  query: { isPending: boolean; error: unknown; refetch: () => Promise<unknown> };
  isEmpty?: boolean | undefined;
  emptyMessage?: string | undefined;
  children: ReactNode;
}

/** Loading → error (with retry) → empty → content: the same sequence for every query of the UI. */
export function QueryState({ query, isEmpty = false, emptyMessage, children }: QueryStateProps) {
  if (query.isPending) return <Spinner />;
  if (query.error) {
    return (
      <ErrorState
        error={query.error}
        onRetry={() => {
          void query.refetch();
        }}
      />
    );
  }
  if (isEmpty) return <EmptyState message={emptyMessage} />;
  return children;
}
