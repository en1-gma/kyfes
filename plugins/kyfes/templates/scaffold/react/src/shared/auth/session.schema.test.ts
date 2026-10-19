import { describe, expect, it } from 'vitest';
import { SessionSchema } from './session.schema';

const base = {
  user: { id: 'u1', name: 'Maria', email: 'maria@example.com' },
  rules: [{ action: 'read', subject: 'Order' }],
};

describe('SessionSchema', () => {
  it.each([null, 42, undefined])(
    'drops an invalid locale (%j) instead of rejecting the session',
    (locale) => {
      expect(SessionSchema.parse({ ...base, locale }).locale).toBeUndefined();
    },
  );

  it('accepts rules for actions and subjects the client does not know', () => {
    const rules = [{ action: 'export', subject: 'Invoice' }];
    expect(SessionSchema.parse({ ...base, rules }).rules).toEqual(rules);
  });
});
