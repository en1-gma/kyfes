import { describe, expect, it } from 'vitest';
import { sanitizeHtml } from './sanitize';

describe('sanitizeHtml', () => {
  it('keeps harmless markup', () => {
    expect(sanitizeHtml('<p>Hello <strong>world</strong></p>')).toBe('<p>Hello <strong>world</strong></p>');
  });

  it('removes scripts and event handlers', () => {
    const out = sanitizeHtml(
      '<img src="x" onerror="alert(1)"><script>alert(2)</script><p onclick="x()">ok</p>',
    );
    expect(out).not.toMatch(/onerror|onclick|<script/i);
    expect(out).toContain('<p>ok</p>');
  });

  it('removes javascript: links and forces rel on links opening a new tab', () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).not.toContain('javascript:');
    expect(sanitizeHtml('<a href="https://example.com" target="_blank">x</a>')).toContain(
      'rel="noopener noreferrer"',
    );
  });

  it('drops style and svg payloads', () => {
    expect(sanitizeHtml('<p style="color:red">a</p><svg><script>1</script></svg>')).toBe('<p>a</p>');
  });
});
