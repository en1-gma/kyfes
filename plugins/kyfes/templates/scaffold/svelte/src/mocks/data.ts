import { ORDER_FIELDS, ORDER_STATUS, ORDER_SUBJECT, type Order } from '$lib/features/orders';
import type { Session } from '$lib/shared/auth';
import { Action } from '$lib/shared/rbac';

/** Fields the operator may write: never `status`. */
const OPERATOR_FIELDS = [ORDER_FIELDS.customerName, ORDER_FIELDS.total];

export type MockUser = 'manager' | 'viewer' | 'operator';

export const SESSIONS: Record<MockUser, Session> = {
	manager: {
		user: { id: 'u-manager', name: 'Maria Manager', email: 'maria.manager@example.com' },
		rules: [{ action: Action.Manage, subject: ORDER_SUBJECT }],
		locale: 'it'
	},
	viewer: {
		user: { id: 'u-viewer', name: 'Vittorio Viewer', email: 'vittorio.viewer@example.com' },
		rules: [{ action: Action.Read, subject: ORDER_SUBJECT }],
		locale: 'it'
	},
	// Field-level and conditional rules: never sets `status`, edits only draft orders.
	operator: {
		user: { id: 'u-operator', name: 'Olga Operator', email: 'olga.operator@example.com' },
		rules: [
			{ action: Action.Read, subject: ORDER_SUBJECT },
			{ action: Action.Create, subject: ORDER_SUBJECT, fields: OPERATOR_FIELDS },
			{
				action: Action.Update,
				subject: ORDER_SUBJECT,
				fields: OPERATOR_FIELDS,
				conditions: { [ORDER_FIELDS.status]: ORDER_STATUS.draft }
			}
		],
		locale: 'it'
	}
};

const CUSTOMERS = ['Rossi S.p.A.', 'Bianchi Srl', 'Verdi & Figli', 'Acme Italia', 'Neri Logistica'];
const STATUSES: Order['status'][] = Object.values(ORDER_STATUS);

export function seedOrders(count = 45): Order[] {
	const start = Date.UTC(2026, 0, 5);
	return Array.from({ length: count }, (_, index) => {
		const n = index + 1;
		return {
			id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
			number: `ORD-${String(n).padStart(4, '0')}`,
			customerName: CUSTOMERS[index % CUSTOMERS.length] ?? 'Cliente',
			status: STATUSES[index % STATUSES.length] ?? ORDER_STATUS.draft,
			total: Math.round((120 + ((index * 97) % 1800)) * 100) / 100,
			createdAt: new Date(start + index * 5 * 86_400_000).toISOString()
		};
	});
}
