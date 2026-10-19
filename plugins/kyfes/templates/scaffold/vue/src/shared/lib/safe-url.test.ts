import { describe, expect, it } from 'vitest'
import { safeUrl } from './safe-url'

describe('safeUrl', () => {
  it.each([
    ['https://example.com/a', 'https://example.com/a'],
    ['mailto:a@example.com', 'mailto:a@example.com'],
    ['tel:+390000', 'tel:+390000'],
    ['/orders', '/orders'],
    ['./x', './x'],
    ['#top', '#top'],
  ])('accepts %s', (input, expected) => {
    expect(safeUrl(input)).toBe(expected)
  })

  it.each([
    'javascript:alert(1)',
    ' JaVaScRiPt:alert(1)',
    'data:text/html;base64,PHNjcmlwdD4=',
    'vbscript:x',
    'ftp://example.com',
    '//evil.example',
    '/\\evil',
    'java\nscript:alert(1)',
    '',
    null,
  ])('rejects %s', (input) => {
    expect(safeUrl(input)).toBeUndefined()
  })

  it('rejects plain http', () => {
    expect(safeUrl(['http', '://example.com'].join(''))).toBeUndefined()
  })
})
