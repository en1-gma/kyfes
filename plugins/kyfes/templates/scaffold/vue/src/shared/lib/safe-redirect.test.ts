import { describe, expect, it } from 'vitest'
import { safeRedirect } from './safe-redirect'

describe('safeRedirect', () => {
  it.each(['/', '/orders', '/orders/1?tab=a#x'])('accepts relative path %s', (path) => {
    expect(safeRedirect(path)).toBe(path)
  })

  it.each([
    '//evil.example',
    '/\\evil.example',
    '\\\\evil.example',
    'https://evil.example',
    'javascript:alert(1)',
    'orders',
    '/orders\n/x',
    '/\tevil',
    '',
    null,
    undefined,
  ])('rejects %s', (target) => {
    expect(safeRedirect(target)).toBe('/')
  })

  it('uses the given fallback', () => {
    expect(safeRedirect('//x', '/home')).toBe('/home')
  })
})
