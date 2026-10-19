import { buildAbility } from '@shared/rbac';
import { SessionSchema } from './session.schema';

const user = { id: 'u-1', name: 'Maria', email: 'maria@example.com' };

describe('SessionSchema', () => {
  it.each([['xx'], [null], [undefined], [42]])('locale %j non supportato diventa undefined', (locale) => {
    const result = SessionSchema.safeParse({ user, rules: [], locale });
    expect(result.success).toBe(true);
    expect(result.data?.locale).toBeUndefined();
  });

  it('mantiene un locale supportato', () => {
    expect(SessionSchema.parse({ user, rules: [], locale: 'en' }).locale).toBe('en');
  });

  it('regole con azioni/soggetti sconosciuti non fanno fallire la sessione e non fanno match', () => {
    const session = SessionSchema.parse({
      user,
      locale: 'it',
      rules: [
        { action: 'approve', subject: 'Invoice' },
        { action: ['archive', 'read'], subject: ['Report', 'Order'] },
      ],
    });
    expect(session.rules).toHaveLength(2);
    const ability = buildAbility(session.rules);
    expect(ability.can('read', 'Order')).toBe(true);
    expect(ability.can('update', 'Order')).toBe(false);
    expect(ability.can('delete', 'all')).toBe(false);
  });
});
