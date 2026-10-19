import type { Session } from '@/shared/auth';
import {
  DEFAULT_ORDER_STATUS,
  ORDER_FIELDS,
  ORDER_STATUS,
  ORDER_STATUSES,
  ORDER_SUBJECT,
  type Order,
} from '@/features/orders';
import { ACTIONS } from '@/shared/rbac';

export type MockUser = 'manager' | 'viewer' | 'operator';

/** Sessions returned by `GET /api/auth/me`: permissions come only from `rules`. */
export const mockSessions: Record<MockUser, Session> = {
  manager: {
    user: { id: 'u-manager', name: 'Maria Manager', email: 'maria.manager@example.com' },
    rules: [{ action: ACTIONS.manage, subject: ORDER_SUBJECT }],
    locale: 'it',
  },
  viewer: {
    user: { id: 'u-viewer', name: 'Vito Viewer', email: 'vito.viewer@example.com' },
    rules: [{ action: ACTIONS.read, subject: ORDER_SUBJECT }],
    locale: 'it',
  },
  // Record + field level: may edit only draft orders, and never their status.
  operator: {
    user: { id: 'u-operator', name: 'Olga Operator', email: 'olga.operator@example.com' },
    rules: [
      { action: ACTIONS.read, subject: ORDER_SUBJECT },
      {
        action: ACTIONS.create,
        subject: ORDER_SUBJECT,
        fields: [ORDER_FIELDS.customerName, ORDER_FIELDS.total],
      },
      {
        action: ACTIONS.update,
        subject: ORDER_SUBJECT,
        fields: [ORDER_FIELDS.customerName, ORDER_FIELDS.total],
        conditions: { [ORDER_FIELDS.status]: ORDER_STATUS.draft },
      },
    ],
    locale: 'it',
  },
};

const CUSTOMERS = [
  'Rossi S.r.l.',
  'Bianchi S.p.A.',
  'Verdi & Figli',
  'Neri Logistica',
  'Gallo Impianti',
  'Conti Food',
];

function seedOrders(count: number): Order[] {
  const start = Date.UTC(2025, 11, 1);
  return Array.from({ length: count }, (_, i) => {
    const n = i + 1;
    return {
      id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
      number: `ORD-${String(1000 + n)}`,
      customerName: CUSTOMERS[i % CUSTOMERS.length] ?? 'Cliente',
      status: ORDER_STATUSES[i % ORDER_STATUSES.length] ?? DEFAULT_ORDER_STATUS,
      total: ((n * 7919) % 50_000) + 100,
      createdAt: new Date(start + i * 4 * 86_400_000).toISOString(),
    };
  });
}

/** In-memory database shared by browser and node handlers. */
export const db = {
  orders: seedOrders(45),
  user: 'manager' as MockUser,
  reset() {
    this.orders = seedOrders(45);
    this.user = 'manager';
  },
};

/** Select the logged user of the mocks (tests, or VITE_MOCK_USER in the browser). */
export function setMockUser(user: MockUser): void {
  db.user = user;
}
