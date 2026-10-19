import type { RouteRecordRaw } from 'vue-router'
import { ACTION, FORBIDDEN_ROUTE } from '@/shared/rbac'
import { ORDER_SUBJECT, ORDERS_FEATURE, ORDERS_NAMESPACE } from '@/features/orders'
import MainLayout from '@/pages/MainLayout.vue'
import { ROUTES } from '@/pages/route-names'

const ordersMeta = { namespaces: [ORDERS_NAMESPACE], titleKey: 'orders.title' }
/** 404 and 403 share the catch-all pattern (see below). */
const CATCH_ALL_PATH = ':pathMatch(.*)*'

/** Every page is lazy (code splitting per route). Permissions live in `meta.permission`. */
export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: MainLayout,
    children: [
      { path: '', redirect: { name: ROUTES.orders } },
      {
        path: ORDERS_FEATURE,
        name: ROUTES.orders,
        component: () => import('@/pages/OrdersPage.vue'),
        meta: { ...ordersMeta, permission: { action: ACTION.read, subject: ORDER_SUBJECT } },
      },
      {
        path: 'orders/new',
        name: ROUTES.orderNew,
        component: () => import('@/pages/NewOrderPage.vue'),
        meta: { ...ordersMeta, permission: { action: ACTION.create, subject: ORDER_SUBJECT } },
      },
      {
        path: 'orders/:id',
        name: ROUTES.orderDetail,
        component: () => import('@/pages/OrderDetailPage.vue'),
        props: true,
        meta: { ...ordersMeta, permission: { action: ACTION.read, subject: ORDER_SUBJECT } },
      },
      {
        path: 'orders/:id/edit',
        name: ROUTES.orderEdit,
        component: () => import('@/pages/OrderEditPage.vue'),
        props: true,
        // Type-level check only: OrderEditPage checks the loaded record (conditions, e.g. status).
        meta: { ...ordersMeta, permission: { action: ACTION.update, subject: ORDER_SUBJECT } },
      },
      // 404 is matched by URL; the 403 route has the same pattern but is reached only by name
      // (permission guard), so the requested URL stays in the address bar.
      {
        path: CATCH_ALL_PATH,
        name: ROUTES.notFound,
        component: () => import('@/pages/NotFoundPage.vue'),
        meta: { titleKey: 'common.errors.notFoundTitle' },
      },
      {
        path: CATCH_ALL_PATH,
        name: FORBIDDEN_ROUTE,
        component: () => import('@/pages/ForbiddenPage.vue'),
        meta: { titleKey: 'common.errors.forbiddenTitle' },
      },
    ],
  },
]
