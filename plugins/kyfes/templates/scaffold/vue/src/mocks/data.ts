import type { Session } from '@/shared/auth'
import { ACTION } from '@/shared/rbac'
import {
  DEFAULT_ORDER_STATUS,
  ORDER_FIELD,
  ORDER_STATUS,
  ORDER_STATUSES,
  ORDER_SUBJECT,
  type Order,
} from '@/features/orders'

export type MockUser = 'manager' | 'operator' | 'viewer'

/** CASL rules per mock user: what /api/auth/me returns. */
export const sessions: Record<MockUser, Session> = {
  manager: {
    user: { id: 'u-manager', name: 'Maria Rossi', email: 'maria.rossi@example.com' },
    locale: 'it',
    rules: [
      { action: ACTION.manage, subject: ORDER_SUBJECT },
      // Shipped orders are frozen; the status of a cancelled order cannot change.
      {
        action: [ACTION.update, ACTION.delete],
        subject: ORDER_SUBJECT,
        conditions: { status: ORDER_STATUS.shipped },
        inverted: true,
      },
      {
        action: ACTION.update,
        subject: ORDER_SUBJECT,
        fields: [ORDER_FIELD.status],
        conditions: { status: ORDER_STATUS.cancelled },
        inverted: true,
      },
    ],
  },
  // Field-level rules: may write customer and total (never the status), and edit only drafts.
  operator: {
    user: { id: 'u-operator', name: 'Giulia Verdi', email: 'giulia.verdi@example.com' },
    locale: 'it',
    rules: [
      { action: ACTION.read, subject: ORDER_SUBJECT },
      {
        action: ACTION.create,
        subject: ORDER_SUBJECT,
        fields: [ORDER_FIELD.customerName, ORDER_FIELD.total],
      },
      {
        action: ACTION.update,
        subject: ORDER_SUBJECT,
        fields: [ORDER_FIELD.customerName, ORDER_FIELD.total],
        conditions: { status: ORDER_STATUS.draft },
      },
    ],
  },
  viewer: {
    user: { id: 'u-viewer', name: 'Luca Bianchi', email: 'luca.bianchi@example.com' },
    locale: 'it',
    rules: [{ action: ACTION.read, subject: ORDER_SUBJECT }],
  },
}

/** Special ids that make the mock API fail (to exercise error states). */
export const FORBIDDEN_ORDER_ID = '00000000-0000-4000-8000-000000000403'
export const BROKEN_ORDER_ID = '00000000-0000-4000-8000-000000000500'

const CUSTOMERS = ['Acme S.p.A.', 'Globex S.r.l.', 'Initech', 'Umbrella Italia', 'Stark Industries']

function seedOrder(i: number): Order {
  const created = new Date(Date.UTC(2026, 0, 1) + i * 4 * 86_400_000)
  return {
    id: `10000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
    number: `ORD-${String(1000 + i)}`,
    customerName: CUSTOMERS[i % CUSTOMERS.length] ?? 'Acme S.p.A.',
    status: ORDER_STATUSES[i % ORDER_STATUSES.length] ?? DEFAULT_ORDER_STATUS,
    total: Math.round((100 + ((i * 7919) % 2400)) * 100) / 100,
    createdAt: created.toISOString(),
  }
}

export function createDb(count = 45) {
  return { orders: Array.from({ length: count }, (_, i) => seedOrder(i)) }
}

export type MockDb = ReturnType<typeof createDb>
