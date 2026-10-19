import { describe, expect, it } from 'vitest';
import { safeUrl } from './safe-url';

describe('safeUrl', () => {
  it.each([
    ['https://example.com/a', 'https://example.com/a'],
    ['mailto:a@example.com', 'mailto:a@example.com'],
    ['tel:+390000000', 'tel:+390000000'],
    ['/relative/path', '/relative/path'],
  ])('accepts %s', (input, expected) => {
    expect(safeUrl(input)).toBe(expected);
  });

  it.each([
    'javascript:alert(1)',
    ' JaVaScRiPt:alert(1)',
    'data:text/html;base64,PHNjcmlwdD4=',
    'vbscript:msgbox(1)',
    '//evil.example.com',
    'http' + '://insecure.example.com',
    'java\tscript:alert(1)',
    undefined,
  ])('rejects %s', (input) => {
    expect(safeUrl(input)).toBeUndefined();
  });
});
