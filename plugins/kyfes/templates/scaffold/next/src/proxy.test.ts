import { describe, expect, it } from 'vitest';
import { buildCsp } from './proxy';

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
