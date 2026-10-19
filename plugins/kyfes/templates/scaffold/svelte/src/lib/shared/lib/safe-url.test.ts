import { describe, expect, it } from 'vitest';
import { safeUrl } from './safe-url';

describe('safeUrl', () => {
	it.each([
		['https://example.com/a', 'https://example.com/a'],
		['mailto:a@example.com', 'mailto:a@example.com'],
		['tel:+390000000', 'tel:+390000000'],
		['/orders/1', '/orders/1']
	])('accepts %s', (value, expected) => {
		expect(safeUrl(value)).toBe(expected);
	});

	it.each([
		'javascript:alert(1)',
		' JavaScript:alert(1)',
		'data:text/html,<script>',
		'http://example.com',
		'//evil.example',
		'vbscript:x',
		'',
		null
	])('rejects %s', (value) => {
		expect(safeUrl(value)).toBeUndefined();
	});
});
