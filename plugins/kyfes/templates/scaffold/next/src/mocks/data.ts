import type { Order } from '@/features/orders';
import type { Session } from '@/shared/auth';

export type MockUser = 'manager' | 'operator' | 'viewer';

export const sessions: Record<MockUser, Session> = {
  manager: {
    user: { id: 'u-manager', name: 'Maria Manager', email: 'manager@example.com' },
    rules: [{ action: 'manage', subject: 'Order' }],
    locale: 'it',
  },
  // Field and record conditions: writes customer and total, updates drafts only, never the status.
  operator: {
    user: { id: 'u-operator', name: 'Oscar Operator', email: 'operator@example.com' },
    rules: [
      { action: 'read', subject: 'Order' },
      { action: 'create', subject: 'Order', fields: ['customerName', 'total'] },
      {
        action: 'update',
        subject: 'Order',
        fields: ['customerName', 'total'],
        conditions: { status: 'draft' },
      },
    ],
    locale: 'it',
  },
  viewer: {
    user: { id: 'u-viewer', name: 'Victor Viewer', email: 'viewer@example.com' },
    rules: [{ action: 'read', subject: 'Order' }],
    locale: 'it',
  },
};

const STATUSES: Order['status'][] = ['draft', 'confirmed', 'shipped', 'cancelled'];

function seed(): Order[] {
  return Array.from({ length: 30 }, (_, i) => {
    const n = i + 1;
    const month = String((i % 6) + 1).padStart(2, '0');
    return {
      id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
      number: `ORD-${String(n).padStart(4, '0')}`,
      customerName: `Customer ${n}`,
      status: STATUSES[i % STATUSES.length]!,
      total: 100 + n * 10.5,
      createdAt: `2026-${month}-${String((i % 27) + 1).padStart(2, '0')}T10:00:00.000Z`,
    };
  });
}

export const db = { orders: seed() };

export function resetDb(): void {
  db.orders = seed();
}

/** In-memory mock state: change the user with `setMockUser` (or override the handler). */
export const mockState: { user: MockUser | null } = { user: 'manager' };

export function setMockUser(user: MockUser | null): void {
  mockState.user = user;
}
