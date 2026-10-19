import { describe, expect, it } from 'vitest';
import { sanitizeHtml } from './sanitize';

describe('sanitizeHtml', () => {
	it('keeps safe markup', () => {
		expect(sanitizeHtml('<p>Hi <strong>there</strong></p>')).toBe(
			'<p>Hi <strong>there</strong></p>'
		);
	});

	it('removes scripts and event handlers', () => {
		const out = sanitizeHtml('<img src="x.png" onerror="alert(1)"><script>alert(1)</script>');
		expect(out).not.toContain('onerror');
		expect(out).not.toContain('<script');
	});

	it('removes javascript: links and inline styles', () => {
		const out = sanitizeHtml('<a href="javascript:alert(1)" style="color:red">x</a>');
		expect(out).not.toContain('javascript:');
		expect(out).not.toContain('style=');
	});
});
