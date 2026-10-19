import {
  DEFAULT_ORDER_STATUS,
  ORDER_FIELDS,
  ORDER_STATUS,
  ORDER_STATUSES,
  ORDER_SUBJECT,
  type Order,
} from '@features/orders';
import type { Session } from '@shared/auth';
import { LOCALE } from '@shared/config/constants';
import { Action } from '@shared/rbac';

type MockSession = Session;

export type MockUserKey = 'manager' | 'operator' | 'viewer';
export const MOCK_USER_KEYS: readonly MockUserKey[] = ['manager', 'operator', 'viewer'];

/** Campi scrivibili dall'operatore (gli altri restano in sola lettura). */
const OPERATOR_FIELDS = [ORDER_FIELDS.customerName, ORDER_FIELDS.total];

/** Utenti di prova: le regole CASL arrivano "dal server" come in produzione. */
export const MOCK_SESSIONS: Record<MockUserKey, MockSession> = {
  manager: {
    user: { id: 'u-manager', name: 'Maria Manager', email: 'maria.manager@example.com' },
    locale: LOCALE.it,
    rules: [
      { action: Action.Manage, subject: ORDER_SUBJECT },
      // Condizione sul record: gli ordini spediti non si eliminano.
      {
        action: Action.Delete,
        subject: ORDER_SUBJECT,
        conditions: { [ORDER_FIELDS.status]: ORDER_STATUS.shipped },
        inverted: true,
      },
    ],
  },
  // Permessi per campo e sul record: crea/modifica solo cliente e totale, e solo gli ordini in bozza.
  operator: {
    user: { id: 'u-operator', name: 'Oscar Operator', email: 'oscar.operator@example.com' },
    locale: LOCALE.it,
    rules: [
      { action: Action.Read, subject: ORDER_SUBJECT },
      { action: Action.Create, subject: ORDER_SUBJECT, fields: OPERATOR_FIELDS },
      {
        action: Action.Update,
        subject: ORDER_SUBJECT,
        fields: OPERATOR_FIELDS,
        conditions: { [ORDER_FIELDS.status]: ORDER_STATUS.draft },
      },
    ],
  },
  viewer: {
    user: { id: 'u-viewer', name: 'Vittorio Viewer', email: 'vittorio.viewer@example.com' },
    locale: LOCALE.it,
    rules: [{ action: Action.Read, subject: ORDER_SUBJECT }],
  },
};

const CUSTOMERS = ['Rossi S.r.l.', 'Bianchi S.p.A.', 'Verdi & Figli', 'Neri Logistica', 'Gallo Food'];

function seedOrder(i: number): Order {
  const month = (i % 6) + 1;
  const day = (i % 27) + 1;
  return {
    id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
    number: `ORD-${String(i).padStart(4, '0')}`,
    customerName: CUSTOMERS[i % CUSTOMERS.length] ?? 'Cliente',
    status: ORDER_STATUSES[i % ORDER_STATUSES.length] ?? DEFAULT_ORDER_STATUS,
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
