import { describe, expect, it } from 'vitest'
import { sanitizeHtml } from './sanitize'

describe('sanitizeHtml', () => {
  it('removes scripts and event handlers', () => {
    const out = sanitizeHtml(
      '<p onclick="alert(1)">hi<script>alert(1)</script><img src=x onerror="alert(1)"></p>',
    )
    expect(out).not.toContain('script')
    expect(out).not.toContain('onclick')
    expect(out).not.toContain('onerror')
    expect(out).toContain('<p>hi')
  })

  it('removes javascript: links but keeps safe markup', () => {
    const out = sanitizeHtml('<a href="javascript:alert(1)">x</a><strong>ok</strong>')
    expect(out).not.toContain('javascript:')
    expect(out).toContain('<strong>ok</strong>')
  })

  it('drops forms and inline styles', () => {
    expect(sanitizeHtml('<form action="/x"><input></form><b style="color:red">b</b>')).toBe('<b>b</b>')
  })
})
