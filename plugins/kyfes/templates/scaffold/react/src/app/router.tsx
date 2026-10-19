import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';
import { ORDER_SUBJECT, orderPaths } from '@/features/orders';
import { RequireAuth } from '@/shared/auth';
import { RequirePermission } from '@/shared/rbac';
import { Spinner } from '@/shared/ui';
import NotFoundPage from '@/pages/NotFoundPage';
import { AppLayout } from './AppLayout';
import { page } from './lazy-page';
import { RouteErrorBoundary } from './RouteErrorBoundary';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <RequireAuth />,
    errorElement: <RouteErrorBoundary />,
    // Shown while the lazy route modules of the first navigation load.
    hydrateFallbackElement: <Spinner />,
    children: [
      {
        element: <AppLayout />,
        errorElement: <RouteErrorBoundary />,
        children: [
          { index: true, element: <Navigate to={orderPaths.list} replace /> },
          {
            path: 'orders',
            // read Order for the whole section; missing permission → 403 page, not a redirect.
            element: <RequirePermission action="read" subject={ORDER_SUBJECT} />,
            errorElement: <RouteErrorBoundary />,
            children: [
              { index: true, lazy: page(() => import('@/pages/OrdersPage')) },
              {
                path: 'new',
                element: <RequirePermission action="create" subject={ORDER_SUBJECT} />,
                children: [{ index: true, lazy: page(() => import('@/pages/NewOrderPage')) }],
              },
              { path: ':orderId', lazy: page(() => import('@/pages/OrderDetailPage')) },
              {
                path: ':orderId/edit',
                // Type-level check here, record-level check (conditions) inside OrderDetail.
                element: <RequirePermission action="update" subject={ORDER_SUBJECT} />,
                children: [{ index: true, lazy: page(() => import('@/pages/OrderEditPage')) }],
              },
            ],
          },
          { path: 'forbidden', lazy: page(() => import('@/pages/ForbiddenPage')) },
          // Static: also used by RouteErrorBoundary.
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
];

export function createAppRouter() {
  return createBrowserRouter(routes);
}
