import { describe, expect, it } from 'vitest';
import { sanitizeHtml } from './sanitize';

describe('sanitizeHtml', () => {
  it('removes scripts and event handlers', () => {
    const out = sanitizeHtml('<p onclick="alert(1)">hi<script>alert(1)</script></p>');
    expect(out).toBe('<p>hi</p>');
  });

  it('removes javascript: links but keeps safe markup', () => {
    const out = sanitizeHtml('<a href="javascript:alert(1)">x</a><strong>ok</strong>');
    expect(out).not.toContain('javascript:');
    expect(out).toContain('<strong>ok</strong>');
  });

  it('drops style attributes and forms', () => {
    expect(sanitizeHtml('<span style="color:red">a</span><form><input></form>')).toBe(
      '<span>a</span>',
    );
  });
});
