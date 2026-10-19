'use client';

import { ErrorState } from '@/shared/ui';

/** Shared body of the route error boundaries (error.tsx). */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState error={error} onRetry={reset} />;
}
