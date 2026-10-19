import type { Order } from '$lib/features/orders';
import type { Session } from '$lib/shared/auth';

export type MockUser = 'manager' | 'viewer';

export const SESSIONS: Record<MockUser, Session> = {
	manager: {
		user: { id: 'u-manager', name: 'Maria Manager', email: 'maria.manager@example.com' },
		rules: [{ action: 'manage', subject: 'Order' }],
		locale: 'it'
	},
	viewer: {
		user: { id: 'u-viewer', name: 'Vittorio Viewer', email: 'vittorio.viewer@example.com' },
		rules: [{ action: 'read', subject: 'Order' }],
		locale: 'it'
	}
};

const CUSTOMERS = ['Rossi S.p.A.', 'Bianchi Srl', 'Verdi & Figli', 'Acme Italia', 'Neri Logistica'];
const STATUSES: Order['status'][] = ['draft', 'confirmed', 'shipped', 'cancelled'];

export function seedOrders(count = 45): Order[] {
	const start = Date.UTC(2026, 0, 5);
	return Array.from({ length: count }, (_, index) => {
		const n = index + 1;
		return {
			id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
			number: `ORD-${String(n).padStart(4, '0')}`,
			customerName: CUSTOMERS[index % CUSTOMERS.length] ?? 'Cliente',
			status: STATUSES[index % STATUSES.length] ?? 'draft',
			total: Math.round((120 + ((index * 97) % 1800)) * 100) / 100,
			createdAt: new Date(start + index * 5 * 86_400_000).toISOString()
		};
	});
}
