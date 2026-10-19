import { isRouteErrorResponse, useRouteError } from 'react-router';
import { ErrorState } from '@/shared/ui';
import NotFoundPage from '@/pages/NotFoundPage';

/** Error boundary of every route: render errors and loader errors never blank the app. */
export function RouteErrorBoundary() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />;
  return (
    <div className="page">
      <ErrorState
        error={error}
        onRetry={() => {
          window.location.reload();
        }}
      />
    </div>
  );
}
