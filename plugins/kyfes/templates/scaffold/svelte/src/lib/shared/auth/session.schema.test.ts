import { describe, expect, it } from 'vitest';
import { buildAbility } from '$lib/shared/rbac';
import { SessionSchema } from './session.schema';

const user = { id: 'u-1', name: 'Ada', email: 'ada@example.com' };

describe('SessionSchema', () => {
	it.each(['de', 'en-US', null, 42, undefined])('turns the locale %j into undefined', (locale) => {
		const session = SessionSchema.parse({ user, rules: [], locale });
		expect(session.locale).toBeUndefined();
	});

	it('keeps a supported locale', () => {
		expect(SessionSchema.parse({ user, rules: [], locale: 'en' }).locale).toBe('en');
	});

	it('keeps rules with unknown subjects/actions: they simply never match', () => {
		const session = SessionSchema.parse({
			user,
			rules: [
				{ action: 'read', subject: 'Invoice' },
				{ action: 'export', subject: 'Order' },
				{ action: 'read', subject: 'Order' }
			]
		});
		expect(session.rules).toHaveLength(3);
		const ability = buildAbility(session.rules);
		expect(ability.can('read', 'Order')).toBe(true);
		expect(ability.can('update', 'Order')).toBe(false);
		expect(ability.can('manage', 'Order')).toBe(false);
	});
});
