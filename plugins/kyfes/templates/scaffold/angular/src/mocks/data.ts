import type { Order, OrderStatus } from '@features/orders';
import type { Session } from '@shared/auth';

type MockSession = Session;

export type MockUserKey = 'manager' | 'operator' | 'viewer';
export const MOCK_USER_KEYS: readonly MockUserKey[] = ['manager', 'operator', 'viewer'];

/** Utenti di prova: le regole CASL arrivano "dal server" come in produzione. */
export const MOCK_SESSIONS: Record<MockUserKey, MockSession> = {
  manager: {
    user: { id: 'u-manager', name: 'Maria Manager', email: 'maria.manager@example.com' },
    locale: 'it',
    rules: [
      { action: 'manage', subject: 'Order' },
      // Condizione sul record: gli ordini spediti non si eliminano.
      { action: 'delete', subject: 'Order', conditions: { status: 'shipped' }, inverted: true },
    ],
  },
  // Permessi per campo e sul record: crea/modifica solo cliente e totale, e solo gli ordini in bozza.
  operator: {
    user: { id: 'u-operator', name: 'Oscar Operator', email: 'oscar.operator@example.com' },
    locale: 'it',
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
  },
  viewer: {
    user: { id: 'u-viewer', name: 'Vittorio Viewer', email: 'vittorio.viewer@example.com' },
    locale: 'it',
    rules: [{ action: 'read', subject: 'Order' }],
  },
};

const STATUSES: OrderStatus[] = ['draft', 'confirmed', 'shipped', 'cancelled'];
const CUSTOMERS = ['Rossi S.r.l.', 'Bianchi S.p.A.', 'Verdi & Figli', 'Neri Logistica', 'Gallo Food'];

function seedOrder(i: number): Order {
  const month = (i % 6) + 1;
  const day = (i % 27) + 1;
  return {
    id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
    number: `ORD-${String(i).padStart(4, '0')}`,
    customerName: CUSTOMERS[i % CUSTOMERS.length] ?? 'Cliente',
    status: STATUSES[i % STATUSES.length] ?? 'draft',
    total: Math.round((100 + i * 37.5) * 100) / 100,
    createdAt: new Date(Date.UTC(2026, month - 1, day, 9, 0, 0)).toISOString(),
  };
}

export const SEED_SIZE = 45;

export function seedOrders(): Order[] {
  return Array.from({ length: SEED_SIZE }, (_, i) => seedOrder(i + 1)).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}
