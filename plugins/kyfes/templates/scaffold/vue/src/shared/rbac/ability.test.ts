import { describe, expect, it } from 'vitest'
import { SessionSchema } from '@/shared/auth'
import { ACTION, SUBJECT, buildAbility } from './ability'

describe('buildAbility', () => {
  it('unknown subjects and actions from the server simply never match', () => {
    const session = SessionSchema.parse({
      user: { id: 'u', name: 'U', email: 'u@example.com' },
      rules: [
        { action: ACTION.read, subject: 'Invoice' },
        { action: 'export', subject: SUBJECT.Order },
        { action: ACTION.read, subject: SUBJECT.Order },
      ],
    })
    const ability = buildAbility(session.rules)
    expect(ability.can(ACTION.read, SUBJECT.Order)).toBe(true)
    expect(ability.can(ACTION.update, SUBJECT.Order)).toBe(false)
    expect(ability.rulesFor(ACTION.read, SUBJECT.Order)).toHaveLength(1)
  })
})
