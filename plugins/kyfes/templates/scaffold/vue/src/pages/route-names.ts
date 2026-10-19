import { ORDERS_FEATURE } from '@/features/orders'

/** Route names shared by pages (links) and app/router (definitions). */
export const ROUTES = {
  orders: ORDERS_FEATURE,
  orderNew: 'order-new',
  orderDetail: 'order-detail',
  orderEdit: 'order-edit',
  notFound: 'not-found',
} as const
