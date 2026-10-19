import { describe, expect, it } from 'vitest';
import { safeUrl } from './safe-url';

describe('safeUrl', () => {
  it.each([
    ['https://example.com/a?b=1', 'https://example.com/a?b=1'],
    ['mailto:info@example.com', 'mailto:info@example.com'],
    ['tel:+390612345678', 'tel:+390612345678'],
    ['/orders/1', '/orders/1'],
    ['#section', '#section'],
    ['orders/1', 'orders/1'],
  ])('accepts %s', (input, expected) => {
    expect(safeUrl(input)).toBe(expected);
  });

  it.each([
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    ' javascript:alert(1)',
    'java\tscript:alert(1)',
    'data:text/html;base64,PHNjcmlwdD4=',
    'http://example.com',
    '//evil.example',
    'vbscript:msgbox(1)',
    '',
    null,
  ])('rejects %j', (input) => {
    expect(safeUrl(input)).toBeUndefined();
  });
});
