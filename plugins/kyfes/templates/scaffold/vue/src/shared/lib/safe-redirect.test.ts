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

  it.each([
    '/.//evil.example',
    '/a/..//evil.example',
    '/%2e%2e//evil.example',
    '/..//evil.example',
    '/./%2F/evil.example',
    '/%5Cevil.example',
  ])('rejects %s once normalized', (target) => {
    expect(safeRedirect(target)).toBe('/')
  })

  it('keeps paths that stay same-origin after normalization', () => {
    expect(safeRedirect('/a/../orders')).toBe('/orders')
  })

  it('uses the given fallback', () => {
    expect(safeRedirect('//x', '/home')).toBe('/home')
  })
})
