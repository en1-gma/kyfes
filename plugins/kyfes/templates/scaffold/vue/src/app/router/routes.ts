import type { RouteRecordRaw } from 'vue-router'
import { CATCH_ALL_PATH, FORBIDDEN_ROUTE, ROUTE_NAME } from '@/shared/config/constants'
import { ACTION } from '@/shared/rbac'
import { ORDER_ROUTE, ORDER_ROUTE_PATH, ORDER_SUBJECT, ORDERS_NAMESPACE } from '@/features/orders'
import MainLayout from '@/pages/MainLayout.vue'

const ordersMeta = { namespaces: [ORDERS_NAMESPACE], titleKey: 'orders.title' }

/** Every page is lazy (code splitting per route). Permissions live in `meta.permission`. */
export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: MainLayout,
    children: [
      { path: '', redirect: { name: ORDER_ROUTE.list } },
      {
        path: ORDER_ROUTE_PATH.list,
        name: ORDER_ROUTE.list,
        component: () => import('@/pages/OrdersPage.vue'),
        meta: { ...ordersMeta, permission: { action: ACTION.read, subject: ORDER_SUBJECT } },
      },
      {
        path: ORDER_ROUTE_PATH.create,
        name: ORDER_ROUTE.create,
        component: () => import('@/pages/NewOrderPage.vue'),
        meta: { ...ordersMeta, permission: { action: ACTION.create, subject: ORDER_SUBJECT } },
      },
      {
        path: ORDER_ROUTE_PATH.detail,
        name: ORDER_ROUTE.detail,
        component: () => import('@/pages/OrderDetailPage.vue'),
        props: true,
        meta: { ...ordersMeta, permission: { action: ACTION.read, subject: ORDER_SUBJECT } },
      },
      {
        path: ORDER_ROUTE_PATH.edit,
        name: ORDER_ROUTE.edit,
        component: () => import('@/pages/OrderEditPage.vue'),
        props: true,
        // Type-level check only: OrderEditPage checks the loaded record (conditions, e.g. status).
        meta: { ...ordersMeta, permission: { action: ACTION.update, subject: ORDER_SUBJECT } },
      },
      // 404 is matched by URL; the 403 route has the same pattern but is reached only by name
      // (permission guard), so the requested URL stays in the address bar.
      {
        path: CATCH_ALL_PATH,
        name: ROUTE_NAME.notFound,
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
