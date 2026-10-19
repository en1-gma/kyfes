import { sanitizeHtml } from './sanitize';

describe('sanitizeHtml', () => {
  it('rimuove script e handler inline', () => {
    const out = sanitizeHtml('<p onclick="alert(1)">ciao<script>alert(1)</script></p>');
    expect(out).toBe('<p>ciao</p>');
  });

  it('neutralizza gli URL javascript:', () => {
    const out = sanitizeHtml('<a href="javascript:alert(1)">x</a>');
    expect(out).not.toContain('javascript:');
  });

  it('mantiene la formattazione sicura', () => {
    expect(sanitizeHtml('<strong>ok</strong>')).toBe('<strong>ok</strong>');
  });

  it('rimuove stili e form', () => {
    expect(sanitizeHtml('<form><input></form><span style="color:red">x</span>')).toBe('<span>x</span>');
  });
});
