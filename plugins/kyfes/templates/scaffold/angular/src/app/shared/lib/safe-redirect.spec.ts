import { safeRedirect } from './safe-redirect';

describe('safeRedirect', () => {
  it.each(['/orders', '/orders/1?tab=x#top', '/'])('accetta il percorso relativo %s', (path) => {
    expect(safeRedirect(path)).toBe(path);
  });

  it.each([
    'https://evil.example.com',
    'javascript:alert(1)',
    '//evil.example.com',
    '/\\evil.example.com',
    '\\\\evil.example.com',
    'orders',
    '/orders\u0000',
    '/ok\nLocation: x',
    '',
    '/.//evil.example',
    '/a/..//evil.example',
    '/%2e%2e//evil.example',
    '/..//evil.example',
    '/./%2F/evil.example',
    '/%5Cevil.example',
  ])('rifiuta %j', (path) => {
    expect(safeRedirect(path)).toBe('/');
  });

  it('normalizza i segmenti `..` restando sulla stessa origine', () => {
    expect(safeRedirect('/a/../orders')).toBe('/orders');
  });

  it('usa il fallback per valori non stringa', () => {
    expect(safeRedirect(undefined, '/home')).toBe('/home');
    expect(safeRedirect(42)).toBe('/');
  });
});
