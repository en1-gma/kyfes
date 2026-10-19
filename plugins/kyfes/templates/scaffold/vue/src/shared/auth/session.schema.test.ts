import { describe, expect, it } from 'vitest'
import { sessions } from '@/mocks/data'
import { SessionSchema } from './session.schema'

describe('SessionSchema', () => {
  it.each(['de', 'en-US', null, 42])('an unsupported locale (%s) becomes undefined', (locale) => {
    const parsed = SessionSchema.parse({ ...sessions.viewer, locale })
    expect(parsed.locale).toBeUndefined()
    expect(parsed.user).toEqual(sessions.viewer.user)
  })

  it('keeps a supported locale', () => {
    expect(SessionSchema.parse({ ...sessions.viewer, locale: 'en' }).locale).toBe('en')
  })

  it('accepts rules with subjects and actions the client does not know', () => {
    const rules = [
      { action: 'read', subject: 'Invoice' },
      { action: 'export', subject: 'Order' },
      ...sessions.viewer.rules,
    ]
    expect(SessionSchema.parse({ ...sessions.viewer, rules }).rules).toEqual(rules)
  })
})
