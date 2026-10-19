import type { RouteRecordRaw } from 'vue-router'
import { FORBIDDEN_ROUTE } from '@/shared/rbac'
import { ORDER_SUBJECT, ORDERS_NAMESPACE } from '@/features/orders'
import MainLayout from '@/pages/MainLayout.vue'
import { ROUTES } from '@/pages/route-names'

const ordersMeta = { namespaces: [ORDERS_NAMESPACE], titleKey: 'orders.title' }

/** Every page is lazy (code splitting per route). Permissions live in `meta.permission`. */
export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: MainLayout,
    children: [
      { path: '', redirect: { name: ROUTES.orders } },
      {
        path: 'orders',
        name: ROUTES.orders,
        component: () => import('@/pages/OrdersPage.vue'),
        meta: { ...ordersMeta, permission: { action: 'read', subject: ORDER_SUBJECT } },
      },
      {
        path: 'orders/new',
        name: ROUTES.orderNew,
        component: () => import('@/pages/NewOrderPage.vue'),
        meta: { ...ordersMeta, permission: { action: 'create', subject: ORDER_SUBJECT } },
      },
      {
        path: 'orders/:id',
        name: ROUTES.orderDetail,
        component: () => import('@/pages/OrderDetailPage.vue'),
        props: true,
        meta: { ...ordersMeta, permission: { action: 'read', subject: ORDER_SUBJECT } },
      },
      {
        path: 'orders/:id/edit',
        name: ROUTES.orderEdit,
        component: () => import('@/pages/OrderEditPage.vue'),
        props: true,
        meta: { ...ordersMeta, permission: { action: 'update', subject: ORDER_SUBJECT } },
      },
      // 404 is matched by URL; the 403 route has the same pattern but is reached only by name
      // (permission guard), so the requested URL stays in the address bar.
      {
        path: ':pathMatch(.*)*',
        name: ROUTES.notFound,
        component: () => import('@/pages/NotFoundPage.vue'),
        meta: { titleKey: 'common.errors.notFoundTitle' },
      },
      {
        path: ':pathMatch(.*)*',
        name: FORBIDDEN_ROUTE,
        component: () => import('@/pages/ForbiddenPage.vue'),
        meta: { titleKey: 'common.errors.forbiddenTitle' },
      },
    ],
  },
]
