import { describe, expect, it } from 'vitest';
import { safeRedirect } from './safe-redirect';

describe('safeRedirect', () => {
  it.each(['/orders', '/orders/1?tab=info', '/a#b'])('accepts %s', (path) => {
    expect(safeRedirect(path)).toBe(path);
  });

  it.each([
    '//evil.example.com',
    'https://evil.example.com',
    'javascript:alert(1)',
    '/\\evil.example.com',
    '\\\\evil.example.com',
    '/foo\nbar',
    'orders',
    '',
    null,
    42,
  ])('rejects %s', (value) => {
    expect(safeRedirect(value, '/home')).toBe('/home');
  });

  it.each([
    '/.//evil.example',
    '/a/..//evil.example',
    '/%2e%2e//evil.example',
    '/..//evil.example',
    '/./%2F/evil.example',
  ])('rejects %s (protocol-relative after normalisation)', (value) => {
    expect(safeRedirect(value, '/home')).toBe('/home');
  });

  it('normalises dot segments that stay on the same origin', () => {
    expect(safeRedirect('/a/../orders', '/home')).toBe('/orders');
  });
});
