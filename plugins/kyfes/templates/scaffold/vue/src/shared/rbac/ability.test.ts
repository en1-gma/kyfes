import { describe, expect, it } from 'vitest'
import { SessionSchema } from '@/shared/auth'
import { buildAbility } from './ability'

describe('buildAbility', () => {
  it('unknown subjects and actions from the server simply never match', () => {
    const session = SessionSchema.parse({
      user: { id: 'u', name: 'U', email: 'u@example.com' },
      rules: [
        { action: 'read', subject: 'Invoice' },
        { action: 'export', subject: 'Order' },
        { action: 'read', subject: 'Order' },
      ],
    })
    const ability = buildAbility(session.rules)
    expect(ability.can('read', 'Order')).toBe(true)
    expect(ability.can('update', 'Order')).toBe(false)
    expect(ability.rulesFor('read', 'Order')).toHaveLength(1)
  })
})
