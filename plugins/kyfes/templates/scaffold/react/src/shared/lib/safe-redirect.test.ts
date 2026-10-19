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
    expect(safeRedirect('/a/../orders')).toBe('/orders');
  });

  it.each([
    '/.//evil.example',
    '/a/..//evil.example',
    '/%2e%2e//evil.example',
    '/..//evil.example',
    '/./%2F/evil.example',
    '/%2F%2Fevil.example',
    '/%5Cevil.example',
  ])('rejects %j, which normalises to another origin', (value) => {
    expect(safeRedirect(value)).toBe('/');
  });
});
