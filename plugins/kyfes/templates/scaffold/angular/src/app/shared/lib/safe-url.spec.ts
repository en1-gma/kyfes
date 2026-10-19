import { safeUrl } from './safe-url';

describe('safeUrl', () => {
  it.each([
    ['https://example.com/a', 'https://example.com/a'],
    ['mailto:info@example.com', 'mailto:info@example.com'],
    ['tel:+390000000', 'tel:+390000000'],
    ['/orders/1', '/orders/1'],
    ['./x', './x'],
  ])('accetta %s', (input, expected) => {
    expect(safeUrl(input)).toBe(expected);
  });

  it.each([
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    'data:text/html;base64,PHNjcmlwdD4=',
    'vbscript:x',
    '//evil.example.com',
    'java\u0000script:alert(1)',
    '/\\evil',
    '',
    null,
  ])('rifiuta %j', (input) => {
    expect(safeUrl(input)).toBeNull();
  });
});
