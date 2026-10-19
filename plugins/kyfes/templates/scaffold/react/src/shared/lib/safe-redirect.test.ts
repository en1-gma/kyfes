import { describe, expect, it } from 'vitest';
import { safeRedirect } from './safe-redirect';

describe('safeRedirect', () => {
  it.each(['/', '/orders', '/orders/42?tab=history#notes'])('accepts same-origin path %s', (path) => {
    expect(safeRedirect(path)).toBe(path);
  });

  it.each([
    '//evil.example',
    '/\\evil.example',
    '\\\\evil.example',
    'https://evil.example',
    'javascript:alert(1)',
    'orders',
    '/orders\u0000',
    '/a\nb',
    ' /orders',
    '',
    undefined,
    42,
  ])('rejects %j', (value) => {
    expect(safeRedirect(value)).toBe('/');
  });

  it('uses the given fallback', () => {
    expect(safeRedirect('//x', '/home')).toBe('/home');
  });

  it('normalises dot segments without leaving the origin', () => {
    expect(safeRedirect('/a/../../orders')).toBe('/orders');
  });
});
