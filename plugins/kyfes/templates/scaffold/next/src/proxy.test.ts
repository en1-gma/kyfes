import { describe, expect, it } from 'vitest';
import { buildCsp, config } from './proxy';

describe('CSP', () => {
  it('is strict in production', () => {
    const csp = buildCsp('abc', false);
    expect(csp).toContain(`script-src 'self' 'nonce-abc' 'strict-dynamic'`);
    expect(csp).toContain(`style-src 'self' 'nonce-abc'`);
    expect(csp).toContain(`object-src 'none'`);
    expect(csp).toContain(`base-uri 'none'`);
    expect(csp).toContain(`frame-ancestors 'none'`);
    expect(csp).not.toContain('unsafe-');
  });
});

describe('proxy matcher', () => {
  const matcher = new RegExp(`^${config.matcher[0]!.source}$`);

  it.each(['/', '/orders', '/orders/1/edit', '/apidocs', '/api-keys', '/apis/x'])(
    'applies the CSP to page %s',
    (path) => {
      expect(matcher.test(path)).toBe(true);
    },
  );

  it.each(['/api', '/api/', '/api/orders', '/_next/static/chunk.js', '/mockServiceWorker.js'])(
    'skips %s',
    (path) => {
      expect(matcher.test(path)).toBe(false);
    },
  );
});
